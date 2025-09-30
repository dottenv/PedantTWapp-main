import os
import re
import time
import docker
from typing import Dict, List

ENV_PATH = os.environ.get("ENV_PATH", "/workspace/.env")
URL_REGEX = re.compile(r"https?://[^\s'\"]*cloudpub\.ru[^\s'\"]*", re.IGNORECASE)

_client = None


def get_client():
    global _client
    if _client is None:
        _client = docker.from_env()
    return _client


def read_env_lines() -> List[str]:
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            return f.read().splitlines()
    except FileNotFoundError:
        return []


def parse_kv(lines: List[str]) -> Dict[str, str]:
    kv: Dict[str, str] = {}
    for line in lines:
        if not line or line.lstrip().startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            kv[k.strip()] = v
    return kv


def safe_write_env(lines: List[str]):
    # создаём бэкап
    try:
        if os.path.exists(ENV_PATH):
            os.replace(ENV_PATH, ENV_PATH + ".bak")
    except Exception:
        pass
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def write_env(updates: dict) -> bool:
    # Читаем и парсим текущие строки
    lines = read_env_lines()
    current = parse_kv(lines)

    # Нормализуем обновления
    normalized = {k: str(v).rstrip("/") for k, v in updates.items()}

    changed = False
    updated_keys = set()
    new_lines: List[str] = []

    for line in lines:
        if not line or line.lstrip().startswith("#") or "=" not in line:
            new_lines.append(line)
            continue
        k, v = line.split("=", 1)
        key = k.strip()
        if key in normalized:
            val = normalized[key]
            if current.get(key) != val:
                changed = True
            new_lines.append(f"{key}={val}")
            updated_keys.add(key)
        else:
            new_lines.append(line)

    # Добавляем отсутствующие ключи в конец
    for key, val in normalized.items():
        if key not in updated_keys and current.get(key) != val:
            new_lines.append(f"{key}={val}")
            changed = True

    if not changed:
        return False

    safe_write_env(new_lines)
    return True


def restart_by_label(label_value: str):
    try:
        cli = get_client()
        containers = cli.containers.list(all=True, filters={"label": f"cloudpub.service={label_value}"})
        for c in containers:
            try:
                c.restart()
            except Exception:
                pass
    except Exception:
        pass


def restart_on_env_change():
    restart_by_label("server")
    restart_by_label("client")
    restart_by_label("admin-client")


def extract_urls(text: str):
    return [m.group(0).rstrip("/") for m in URL_REGEX.finditer(text)]


def key_for_container_name(name: str) -> str:
    name = name.lower()
    if "cloudpub-server" in name:
        return "CLOUDPUB_SERVER_URL"
    if "cloudpub-admin" in name:
        return "CLOUDPUB_ADMIN_URL"
    return "CLOUDPUB_CLIENT_URL"


def main():
    client = get_client()
    targets = ["cloudpub-client", "cloudpub-admin", "cloudpub-server"]
    attached = set()

    while True:
        try:
            containers = client.containers.list(all=True)
            for c in containers:
                names = [n.lstrip("/") for n in c.attrs.get("Names") or []]
                name = names[0] if names else c.name
                if not any(t in name for t in targets):
                    continue
                if c.id in attached:
                    continue
                attached.add(c.id)
                env_key = key_for_container_name(name)

                def attach(container, env_key):
                    for line in container.logs(stream=True, follow=True, tail=100):
                        try:
                            s = line.decode("utf-8", errors="ignore")
                            urls = extract_urls(s)
                            if urls:
                                https_urls = [u for u in urls if u.lower().startswith("https://")]
                                url = (https_urls[0] if https_urls else urls[0]).rstrip("/")
                                if write_env({env_key: url}):
                                    restart_on_env_change()
                        except Exception:
                            pass
                import threading
                threading.Thread(target=attach, args=(c, env_key), daemon=True).start()
        except Exception:
            pass
        time.sleep(10)


if __name__ == "__main__":
    main()
