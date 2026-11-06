import os

from redis import Redis
from rq import Worker


def main() -> None:
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    queues = os.getenv("RQ_QUEUES", "default").split(",")

    connection = Redis.from_url(redis_url)
    worker = Worker([queue.strip() for queue in queues if queue.strip()], connection=connection)
    worker.work()


if __name__ == "__main__":
    main()
