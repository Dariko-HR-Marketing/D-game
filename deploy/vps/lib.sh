# Umumiy sozlama: baza foydalanuvchisi va nomi `.env` dan olinadi (DB_USER, DB_NAME). Skriptlar `. "$(dirname "$0")/lib.sh"` bilan ulaydi.
_env() { grep -E "^$1=" "$(dirname "${BASH_SOURCE[0]}")/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r"'"'"; }
DB_USER="${DB_USER:-$(_env DB_USER)}"; DB_NAME="${DB_NAME:-$(_env DB_NAME)}"
[ -n "$DB_USER" ] && [ -n "$DB_NAME" ] || { echo "XATO: .env da DB_USER va DB_NAME yo'q (docs/SERVER.md)"; exit 1; }
