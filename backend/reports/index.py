import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p93143336_gov_mail_site")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Отчёты: статистика по отправлениям"""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    params = event.get("queryStringParameters") or {}
    user_login = params.get("user_login", "")
    where = f"WHERE user_login = '{user_login}'" if user_login else ""

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f'SELECT COUNT(*) FROM {SCHEMA}.letters {where}')
    total = cur.fetchone()[0]

    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.letters {where} {'AND' if where else 'WHERE'} status = 'Доставлено'")
    delivered = cur.fetchone()[0]

    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.letters {where} {'AND' if where else 'WHERE'} status != 'Доставлено'")
    in_transit = cur.fetchone()[0]

    cur.execute(f'''
        SELECT status, COUNT(*) as cnt
        FROM {SCHEMA}.letters {where}
        GROUP BY status ORDER BY cnt DESC
    ''')
    by_status = [{"status": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute(f'''
        SELECT letter_type, COUNT(*) as cnt
        FROM {SCHEMA}.letters {where}
        GROUP BY letter_type ORDER BY cnt DESC
    ''')
    by_type = [{"type": r[0], "count": r[1]} for r in cur.fetchall()]

    cur.execute(f'''
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as cnt
        FROM {SCHEMA}.letters {where}
        GROUP BY month ORDER BY month DESC LIMIT 6
    ''')
    by_month = [{"month": r[0], "count": r[1]} for r in cur.fetchall()]

    conn.close()

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({
            "total": total,
            "delivered": delivered,
            "in_transit": in_transit,
            "by_status": by_status,
            "by_type": by_type,
            "by_month": by_month,
        }, ensure_ascii=False),
    }
