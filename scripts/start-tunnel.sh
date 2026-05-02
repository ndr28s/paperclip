#!/usr/bin/env bash
# Cloudflare Quick Tunnel 시작 스크립트
# 사용법: ./scripts/start-tunnel.sh
#
# cloudflared 설치 필요:
#   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
#     -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

set -e

PORT=${PAPERCLIP_PORT:-3100}
LOG_FILE="/tmp/cloudflared-paperclip.log"

if ! command -v cloudflared &> /dev/null; then
  echo "cloudflared가 설치되어 있지 않습니다."
  echo ""
  echo "설치 명령어:"
  echo "  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \\"
  echo "    -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared"
  exit 1
fi

echo "Cloudflare Quick Tunnel 시작 중..."
echo "Paperclip 서버: http://localhost:${PORT}"
echo ""

# Named Tunnel 토큰이 있으면 사용
if [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
  echo "Named Tunnel 모드 (고정 URL)"
  cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
else
  echo "Quick Tunnel 모드 (URL이 매 실행마다 변경됩니다)"
  echo "아래 URL이 표시되면 Electron 앱의 서버 주소를 해당 URL로 변경하세요."
  echo "--------------------------------------------------------------"
  cloudflared tunnel --no-autoupdate --url "http://localhost:${PORT}"
fi
