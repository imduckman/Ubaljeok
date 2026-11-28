/**
 * 백엔드 API가 준비되기 전까지 쓰는 가짜 서버.
 * 데이터는 브라우저 localStorage에 저장되어 새로고침해도 유지된다.
 * 데모 계정: demo / demo1234
 */
import { ApiError } from '../../shared/types/api'
import type { LoginRequest, SignupRequest, User } from '../../features/auth/domain/User'
import type { CreateGroupRequest, Group, JoinGroupRequest } from '../../features/group/domain/Group'
import { MAX_GROUP_MEMBERS, isGroupOwner, removeMember } from '../../features/group/domain/Group'
import { TOLL_LIMIT, type Wallet, type WalletTransaction, type WalletTransactionType } from '../../features/wallet/domain/Wallet'
import {
  BUILDING_PRICE,
  LANDMARK_UPGRADE_PRICE,
  type Property,
  type PropertyChangeResult,
} from '../../features/game/domain/Property'
import { getMockProperty, listMockProperties, setMockProperty } from './mockProperties'
import { hasEligibleMockVisit } from './mockVisits'

interface StoredUser extends User {
  password: string
}

/** 거래 한 건 + 어느 그룹 지갑의 기록인지 */
interface StoredTransaction extends WalletTransaction {
  groupId: number
}

interface MockDatabase {
  users: StoredUser[]
  groups: Group[]
  sessionUserId: number | null
  nextId: number
  /** 지갑 거래 내역. 예전에 저장된 데이터에는 없을 수 있어서 load()에서 채운다. */
  transactions?: StoredTransaction[]
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
    transactions: createSeedTransactions(),
  }
}

/** 처음 보여줄 영수증 예시. 밥친구들은 과동기 탐험대 랜드마크(행궁동)에서 통행료를 냈다. */
function createSeedTransactions(): StoredTransaction[] {
  const rows: [number, number, WalletTransactionType, number, string, string][] = [
    [102, 1, 'first_visit', 100, '4111574000', '2026-11-06T13:10:00+09:00'],
    [102, 2, 'first_visit', 100, '4111156000', '2026-11-07T15:40:00+09:00'],
    [102, 3, 'purchase', -100, '4111156000', '2026-11-08T11:00:00+09:00'],
    [102, 4, 'purchase', -100, '4111574000', '2026-11-09T18:20:00+09:00'],
    [102, 5, 'upgrade', -80, '4111574000', '2026-11-10T19:05:00+09:00'],
    [101, 6, 'first_visit', 100, '4111757000', '2026-11-16T14:20:00+09:00'],
    [101, 7, 'first_visit', 100, '4111158000', '2026-11-18T12:30:00+09:00'],
    [101, 8, 'revisit', 10, '4111757000', '2026-11-20T17:45:00+09:00'],
    [101, 9, 'first_visit', 100, '4111574000', '2026-11-22T16:00:00+09:00'],
    [101, 10, 'toll_paid', -30, '4111574000', '2026-11-22T16:00:01+09:00'],
    [102, 11, 'toll_received', 30, '4111574000', '2026-11-22T16:00:01+09:00'],
  ]
  return rows.map(([groupId, id, type, amount, regionCode, createdAt]) => ({ groupId, id, type, amount, regionCode, createdAt }))
}

function addTransaction(
  database: MockDatabase,
  groupId: number,
  type: WalletTransactionType,
  amount: number,
  regionCode: string | null,
): number {
  const id = database.nextId++
  database.transactions = [
    ...(database.transactions ?? []),
    { groupId, id, type, amount, regionCode, createdAt: new Date().toISOString() },
  ]
  return id
}

function load(): MockDatabase {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const database = JSON.parse(saved) as MockDatabase
      database.transactions ??= createSeedTransactions()
      return database
    }
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

  /** 그룹 지갑: 잔액 + 거래 내역(최신순). 가짜 서버는 한 번에 다 돌려줘서 nextCursor가 없다. */
  async getWallet(groupId: number): Promise<Wallet> {
    await delay()
    const database = load()
    const user = requireSession(database)
    const group = findMyGroup(database, groupId, user.userId)
    const transactions = (database.transactions ?? [])
      .filter((transaction) => transaction.groupId === groupId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map(({ id, type, amount, regionCode, createdAt }) => ({ id, type, amount, regionCode, createdAt }))
    return { balance: group.walletBalance ?? 0, transactions, nextCursor: null }
  },

  /** 동네 소유 정보 (모든 그룹이 함께 쓰는 지도판). 그룹 멤버만 볼 수 있다. */
  async listProperties(groupId: number): Promise<Property[]> {
    await delay()
    const database = load()
    const user = requireSession(database)
    findMyGroup(database, groupId, user.userId)
    return listMockProperties()
  },

  /** 건물 구매: 그룹장, 보상 대상 방문, 주인 없음, 코인 100 이상 */
  async purchaseBuilding(groupId: number, regionCode: string): Promise<PropertyChangeResult> {
    await delay()
    const database = load()
    const user = requireSession(database)
    const group = findMyGroup(database, groupId, user.userId)
    if (!isGroupOwner(group, user.userId)) throw new ApiError(403, 'NOT_GROUP_OWNER', '그룹장만 건물을 구매할 수 있어요.')
    if (!hasEligibleMockVisit(groupId, regionCode)) {
      throw new ApiError(422, 'VISIT_REQUIRED', '위치 정보가 있는 사진으로 방문해야 건물을 구매할 수 있어요.')
    }
    if (getMockProperty(regionCode)) throw new ApiError(409, 'REGION_ALREADY_OWNED', '이미 주인이 있는 동네예요.')
    if ((group.walletBalance ?? 0) < BUILDING_PRICE) throw new ApiError(409, 'INSUFFICIENT_COINS', '코인이 모자라요.')

    group.walletBalance = (group.walletBalance ?? 0) - BUILDING_PRICE
    const transactionId = addTransaction(database, groupId, 'purchase', -BUILDING_PRICE, regionCode)
    save(database)
    const property: Property = { regionCode, ownerGroupId: groupId, ownerGroupName: group.name, level: 'building' }
    setMockProperty(property)
    return { property, walletBalance: group.walletBalance, transactionId }
  },

  /** 랜드마크 구매: 우리 그룹 건물, 그룹장, 코인 80 이상 */
  async upgradeBuilding(groupId: number, regionCode: string): Promise<PropertyChangeResult> {
    await delay()
    const database = load()
    const user = requireSession(database)
    const group = findMyGroup(database, groupId, user.userId)
    if (!isGroupOwner(group, user.userId)) throw new ApiError(403, 'NOT_GROUP_OWNER', '그룹장만 랜드마크를 구매할 수 있어요.')
    const current = getMockProperty(regionCode)
    if (!current || current.ownerGroupId !== groupId) throw new ApiError(409, 'BUILDING_NOT_OWNED', '우리 그룹 건물이 아니에요.')
    if (current.level === 'landmark') throw new ApiError(409, 'ALREADY_LANDMARK', '이미 랜드마크예요.')
    if ((group.walletBalance ?? 0) < LANDMARK_UPGRADE_PRICE) throw new ApiError(409, 'INSUFFICIENT_COINS', '코인이 모자라요.')

    group.walletBalance = (group.walletBalance ?? 0) - LANDMARK_UPGRADE_PRICE
    const transactionId = addTransaction(database, groupId, 'upgrade', -LANDMARK_UPGRADE_PRICE, regionCode)
    save(database)
    const property: Property = { ...current, level: 'landmark' }
    setMockProperty(property)
    return { property, walletBalance: group.walletBalance, transactionId }
  },

  /**
   * 개발용: 사진 업로드 정산을 흉내 낸다 (업로드 화면이 정산을 연결하기 전 확인용).
   * 보상을 주고, 그 동네가 다른 그룹 랜드마크면 min(잔액, 30) 통행료를 주인 그룹에게 옮긴다.
   * 영수증에도 같은 거래가 쌓인다.
   */
  settleVisitForDemo(groupId: number, regionCode: string, reward: number): { reward: number; tollPaid: number; balance: number } {
    const database = load()
    const group = database.groups.find((candidate) => candidate.groupId === groupId)
    if (!group) return { reward: 0, tollPaid: 0, balance: 0 }
    group.walletBalance = (group.walletBalance ?? 0) + reward
    addTransaction(database, groupId, reward >= 100 ? 'first_visit' : 'revisit', reward, regionCode)

    let tollPaid = 0
    const property = getMockProperty(regionCode)
    if (property && property.level === 'landmark' && property.ownerGroupId !== groupId) {
      tollPaid = Math.min(group.walletBalance, TOLL_LIMIT)
      group.walletBalance -= tollPaid
      addTransaction(database, groupId, 'toll_paid', -tollPaid, regionCode)
      const owner = database.groups.find((candidate) => candidate.groupId === property.ownerGroupId)
      if (owner) {
        owner.walletBalance = (owner.walletBalance ?? 0) + tollPaid
        addTransaction(database, owner.groupId, 'toll_received', tollPaid, regionCode)
      }
    }
    save(database)
    return { reward, tollPaid, balance: group.walletBalance }
  },

  /** 개발용: 가짜 데이터를 처음 상태로 되돌린다. */
  reset() {
    save(createSeed())
  },
}
