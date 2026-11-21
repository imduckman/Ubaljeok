/**
 * 백엔드 API가 준비되기 전까지 쓰는 가짜 서버.
 * 데이터는 브라우저 localStorage에 저장되어 새로고침해도 유지된다.
 * 데모 계정: demo / demo1234
 */
import { ApiError } from '../../shared/types/api'
import type { LoginRequest, SignupRequest, User } from '../../features/auth/domain/User'
import type { CreateGroupRequest, Group, JoinGroupRequest } from '../../features/group/domain/Group'
import { MAX_GROUP_MEMBERS, isGroupOwner, removeMember } from '../../features/group/domain/Group'
import type { Wallet } from '../../features/wallet/domain/Wallet'

interface StoredUser extends User {
  password: string
}

interface MockDatabase {
  users: StoredUser[]
  groups: Group[]
  sessionUserId: number | null
  nextId: number
}

const STORAGE_KEY = 'ubaljeok-mock-v1'
const NETWORK_DELAY_MS = 350

function createSeed(): MockDatabase {
  return {
    users: [
      { userId: 1, loginId: 'demo', nickname: '승제', password: 'demo1234' },
      { userId: 2, loginId: 'yunha', nickname: '윤하', password: 'demo1234' },
      { userId: 3, loginId: 'heejae', nickname: '희재', password: 'demo1234' },
    ],
    groups: [
      {
        groupId: 101,
        name: '밥친구들',
        inviteCode: 'WK7Q2M',
        members: [
          { userId: 1, nickname: '승제', role: 'OWNER' },
          { userId: 2, nickname: '윤하', role: 'MEMBER' },
          { userId: 3, nickname: '희재', role: 'MEMBER' },
        ],
        walletBalance: 340,
        visitedRegionCount: 12,
        createdAt: '2026-11-02T10:00:00+09:00',
      },
      {
        groupId: 102,
        name: '과동기 탐험대',
        inviteCode: 'TRIP26',
        members: [{ userId: 2, nickname: '윤하', role: 'OWNER' }],
        walletBalance: 120,
        visitedRegionCount: 5,
        createdAt: '2026-11-05T10:00:00+09:00',
      },
    ],
    sessionUserId: null,
    nextId: 200,
  }
}

function load(): MockDatabase {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as MockDatabase
  } catch {
    // 저장소를 못 쓰는 환경이면 매번 새 데이터로 시작한다.
  }
  return createSeed()
}

function save(database: MockDatabase) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database))
  } catch {
    // 무시: 새로고침하면 초기 데이터로 돌아간다.
  }
}

function delay() {
  return new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS))
}

function toUser({ userId, loginId, nickname }: StoredUser): User {
  return { userId, loginId, nickname }
}

function requireSession(database: MockDatabase): StoredUser {
  const user = database.users.find((candidate) => candidate.userId === database.sessionUserId)
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', '다시 로그인해 주세요.')
  return user
}

function findMyGroup(database: MockDatabase, groupId: number, userId: number): Group {
  const group = database.groups.find((candidate) => candidate.groupId === groupId)
  if (!group || !group.members.some((member) => member.userId === userId)) {
    throw new ApiError(404, 'GROUP_NOT_FOUND', '이미 없어졌거나 내가 속하지 않은 그룹이에요.')
  }
  return group
}

function createInviteCode(database: MockDatabase): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  } while (database.groups.some((group) => group.inviteCode === code))
  return code
}

export const mockServer = {
  async login({ loginId, password }: LoginRequest): Promise<User> {
    await delay()
    const database = load()
    const user = database.users.find((candidate) => candidate.loginId === loginId && candidate.password === password)
    if (!user) throw new ApiError(401, 'INVALID_CREDENTIALS', '아이디 또는 비밀번호가 맞지 않아요.')
    database.sessionUserId = user.userId
    save(database)
    return toUser(user)
  },

  async signup({ nickname, loginId, password }: SignupRequest): Promise<User> {
    await delay()
    const database = load()
    if (database.users.some((candidate) => candidate.loginId === loginId)) {
      throw new ApiError(409, 'LOGIN_ID_TAKEN', '이미 쓰고 있는 아이디예요. 다른 아이디를 입력하세요.')
    }
    const user: StoredUser = { userId: database.nextId++, loginId, nickname: nickname.trim(), password }
    database.users.push(user)
    database.sessionUserId = user.userId
    save(database)
    return toUser(user)
  },

  async logout(): Promise<void> {
    await delay()
    const database = load()
    database.sessionUserId = null
    save(database)
  },

  async getMe(): Promise<User | null> {
    await delay()
    const database = load()
    const user = database.users.find((candidate) => candidate.userId === database.sessionUserId)
    return user ? toUser(user) : null
  },

  async listMyGroups(): Promise<Group[]> {
    await delay()
    const database = load()
    const user = requireSession(database)
    return database.groups.filter((group) => group.members.some((member) => member.userId === user.userId))
  },

  async createGroup({ name }: CreateGroupRequest): Promise<Group> {
    await delay()
    const database = load()
    const user = requireSession(database)
    const group: Group = {
      groupId: database.nextId++,
      name: name.trim(),
      inviteCode: createInviteCode(database),
      members: [{ userId: user.userId, nickname: user.nickname, role: 'OWNER' }],
      walletBalance: 0,
      visitedRegionCount: 0,
      createdAt: new Date().toISOString(),
    }
    database.groups.push(group)
    save(database)
    return group
  },

  async joinGroup({ inviteCode }: JoinGroupRequest): Promise<Group> {
    await delay()
    const database = load()
    const user = requireSession(database)
    const group = database.groups.find((candidate) => candidate.inviteCode === inviteCode)
    if (!group) throw new ApiError(404, 'INVITE_NOT_FOUND', '코드를 찾을 수 없어요. 다시 확인해 주세요.')
    if (group.members.some((member) => member.userId === user.userId)) {
      throw new ApiError(409, 'ALREADY_MEMBER', '이미 들어가 있는 그룹이에요.')
    }
    if (group.members.length >= MAX_GROUP_MEMBERS) {
      throw new ApiError(409, 'GROUP_FULL', `이 그룹은 이미 ${MAX_GROUP_MEMBERS}명이 모였어요.`)
    }
    group.members.push({ userId: user.userId, nickname: user.nickname, role: 'MEMBER' })
    save(database)
    return group
  },

  async leaveGroup(groupId: number): Promise<void> {
    await delay()
    const database = load()
    const user = requireSession(database)
    const group = findMyGroup(database, groupId, user.userId)
    const next = removeMember(group, user.userId)
    database.groups = next
      ? database.groups.map((candidate) => (candidate.groupId === groupId ? next : candidate))
      : database.groups.filter((candidate) => candidate.groupId !== groupId)
    save(database)
  },

  async deleteGroup(groupId: number): Promise<void> {
    await delay()
    const database = load()
    const user = requireSession(database)
    const group = findMyGroup(database, groupId, user.userId)
    if (!isGroupOwner(group, user.userId)) {
      throw new ApiError(403, 'NOT_GROUP_OWNER', '그룹장만 그룹을 삭제할 수 있어요.')
    }
    database.groups = database.groups.filter((candidate) => candidate.groupId !== groupId)
    save(database)
  },

  /** 그룹 지갑. 가짜 서버는 거래 내역을 아직 만들지 않는다. */
  async getWallet(groupId: number): Promise<Wallet> {
    await delay()
    const database = load()
    const user = requireSession(database)
    const group = findMyGroup(database, groupId, user.userId)
    return { balance: group.walletBalance ?? 0, transactions: [], nextCursor: null }
  },

  /** 개발용: 코인 연출 확인을 위해 지갑에 코인을 더하고 새 잔액을 돌려준다. */
  addCoinsForDemo(groupId: number, amount: number): number {
    const database = load()
    const group = database.groups.find((candidate) => candidate.groupId === groupId)
    if (!group) return 0
    group.walletBalance = Math.max((group.walletBalance ?? 0) + amount, 0)
    save(database)
    return group.walletBalance
  },

  /** 개발용: 가짜 데이터를 처음 상태로 되돌린다. */
  reset() {
    save(createSeed())
  },
}
