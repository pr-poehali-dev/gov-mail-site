import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p93143336_gov_mail_site")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Авторизация пользователя по логину и паролю"""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

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
    login = body.get("login", "").strip()
    password = body.get("password", "").strip()

    if not login or not password:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Заполните все поля"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f'SELECT login, full_name FROM {SCHEMA}.users WHERE login = %s AND password = %s',
        (login, password)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Неверный логин или пароль"})}

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({"login": row[0], "full_name": row[1]}),
    }