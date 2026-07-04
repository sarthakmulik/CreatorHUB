import httpx
import asyncio

async def run():
    res = await httpx.AsyncClient().delete('http://localhost:8001/api/dashboard/disconnect?platform=youtube&user_id=123')
    print(res.status_code)
    print(res.json())

if __name__ == "__main__":
    asyncio.run(run())
