from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional

from tinydb import TinyDB, Query


class AsyncTinyDB:
    def __init__(self, path: str):
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._db = TinyDB(self._path)
        self._lock = asyncio.Lock()

    async def list(self, table: str) -> List[Dict[str, Any]]:
        async with self._lock:
            return list(self._db.table(table).all())

    async def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            tbl = self._db.table(table)
            next_id = 1
            rows = tbl.all()
            if rows:
                next_id = max([r.get("id", 0) for r in rows]) + 1
            data = {**data, "id": data.get("id", next_id)}
            tbl.insert(data)
            return data

    async def get_by_id(self, table: str, item_id: int) -> Optional[Dict[str, Any]]:
        async with self._lock:
            tbl = self._db.table(table)
            q = Query()
            res = tbl.search(q.id == item_id)
            return res[0] if res else None

    async def upsert(self, table: str, data: Dict[str, Any], key_field: str = "id") -> Dict[str, Any]:
        async with self._lock:
            tbl = self._db.table(table)
            q = Query()
            key_val = data.get(key_field)
            if key_val is None:
                return await self.insert(table, data)
            existing = tbl.search(getattr(q, key_field) == key_val)
            if existing:
                doc_id = existing[0].doc_id
                tbl.update(data, doc_ids=[doc_id])
                return data
            else:
                tbl.insert(data)
                return data

    async def find(self, table: str, **kwargs) -> List[Dict[str, Any]]:
        async with self._lock:
            tbl = self._db.table(table)
            q = Query()
            query = None
            for k, v in kwargs.items():
                qk = getattr(q, k) == v
                query = qk if query is None else (query & qk)
            return tbl.search(query) if query is not None else tbl.all()


db = AsyncTinyDB("data/db.json")
