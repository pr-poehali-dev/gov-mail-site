import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p93143336_gov_mail_site")

STATUSES = [
    "Принято в отделении",
    "В пути к получателю",
    "Прибыло в город назначения",
    "Ожидает получателя",
    "Доставлено",
]

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Login",
    }

def handler(event: dict, context) -> dict:
    """CRUD для писем: сохранение, получение, обновление статуса"""
    headers = cors_headers()

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    method = event.get("httpMethod", "GET")
    raw = event.get("body") or "{}"
    if isinstance(raw, str):
        try:
            body = json.loads(raw)
        except Exception:
            body = {}
    else:
        body = raw if isinstance(raw, dict) else {}
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            body = {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET / — список писем пользователя
        if method == "GET":
            params = event.get("queryStringParameters") or {}
            user_login = params.get("user_login", "")
            tracking = params.get("tracking", "")

            if tracking:
                cur.execute(
                    f'SELECT * FROM {SCHEMA}.letters WHERE tracking_number = %s',
                    (tracking.upper(),)
                )
            elif user_login:
                cur.execute(
                    f'SELECT * FROM {SCHEMA}.letters WHERE user_login = %s ORDER BY created_at DESC',
                    (user_login,)
                )
            else:
                cur.execute(f'SELECT * FROM {SCHEMA}.letters ORDER BY created_at DESC')

            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            letters = []
            for row in rows:
                r = dict(zip(cols, row))
                if r.get("created_at"):
                    r["created_at"] = r["created_at"].strftime("%d.%m.%Y")
                letters.append(r)
            return {"statusCode": 200, "headers": headers, "body": json.dumps(letters, ensure_ascii=False)}

        # POST / — создать письмо
        if method == "POST":
            cur.execute(
                f'''INSERT INTO {SCHEMA}.letters
                (id, tracking_number, user_login, sender_name, sender_address, sender_city, sender_zip,
                 recipient_name, recipient_address, recipient_city, recipient_zip, letter_type, weight, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING''',
                (
                    body["id"], body["tracking_number"], body["user_login"],
                    body.get("sender_name"), body.get("sender_address"),
                    body.get("sender_city"), body.get("sender_zip"),
                    body.get("recipient_name"), body.get("recipient_address"),
                    body.get("recipient_city"), body.get("recipient_zip"),
                    body.get("letter_type"), body.get("weight"),
                    body.get("status", "Принято в отделении"),
                )
            )
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        # PUT / — обновить статус
        if method == "PUT":
            letter_id = body.get("id")
            cur.execute(f'SELECT status FROM {SCHEMA}.letters WHERE id = %s', (letter_id,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Не найдено"})}
            idx = STATUSES.index(row[0]) if row[0] in STATUSES else 0
            new_status = STATUSES[min(idx + 1, len(STATUSES) - 1)]
            cur.execute(f'UPDATE {SCHEMA}.letters SET status = %s WHERE id = %s', (new_status, letter_id))
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"status": new_status})}

        return {"statusCode": 405, "headers": headers, "body": json.dumps({"error": "Method not allowed"})}

    finally:
        conn.close()