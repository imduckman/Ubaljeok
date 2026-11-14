from sqlalchemy import BigInteger, Integer

# PostgreSQL에서는 BIGINT(자동 증가), 테스트용 SQLite에서는 INTEGER로 만들어
# SQLite에서도 id 자동 증가가 되게 한다.
BigIntPK = BigInteger().with_variant(Integer, "sqlite")
