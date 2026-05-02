# Linux 서버 설치 가이드 (Ubuntu 22.04)

로컬 LLM(Ollama)과 연동하여 Paperclip 서버를 Ubuntu 22.04에 설치하는 방법입니다.

---

## 목차

1. [사전 요구 사항](#사전-요구-사항)
2. [방법 A: Docker Compose (권장)](#방법-a-docker-compose-권장)
3. [방법 B: 직접 설치](#방법-b-직접-설치)
4. [Ollama 로컬 LLM 연결](#ollama-로컬-llm-연결)
5. [Cloudflare Tunnel로 외부 접속](#cloudflare-tunnel로-외부-접속)
6. [Electron 앱 / Android 앱 연결](#electron-앱--android-앱-연결)
7. [systemd 서비스 등록 (자동 시작)](#systemd-서비스-등록-자동-시작)
8. [방화벽 설정](#방화벽-설정)
9. [트러블슈팅](#트러블슈팅)

---

## 사전 요구 사항

- Ubuntu 22.04 LTS
- Ollama 설치 완료 (`ollama --version` 으로 확인)
- Git 설치 (`sudo apt install git`)
- 최소 RAM: 8GB (모델 크기에 따라 다름)

---

## 방법 A: Docker Compose (권장)

### 1. Docker 설치

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 레포 클론

```bash
git clone <your-repo-url> paperclip
cd paperclip
```

### 3. 환경변수 설정

```bash
# 랜덤 시크릿 키 생성
SECRET=$(openssl rand -hex 32)
SERVER_IP=$(hostname -I | awk '{print $1}')

cat > .env << EOF
BETTER_AUTH_SECRET=${SECRET}
PAPERCLIP_PUBLIC_URL=http://${SERVER_IP}:3100
EOF

echo ".env 내용:"
cat .env
```

> **참고:** `PAPERCLIP_PUBLIC_URL`은 클라이언트(앱/브라우저)가 접속할 실제 주소입니다.
> 도메인이 있으면 `http://yourdomain.com:3100` 으로 변경하세요.

### 4. 실행

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 5. 확인

```bash
# 컨테이너 상태 확인
docker compose -f docker/docker-compose.yml ps

# 서버 로그 확인
docker compose -f docker/docker-compose.yml logs -f server

# 정상 실행 시 브라우저에서 접속
# http://<서버IP>:3100
```

### 재시작 / 중지

```bash
# 중지
docker compose -f docker/docker-compose.yml down

# 재시작
docker compose -f docker/docker-compose.yml restart

# 데이터 포함 완전 삭제
docker compose -f docker/docker-compose.yml down -v
```

---

## 방법 B: 직접 설치

Docker를 사용하지 않는 경우 아래 방법으로 직접 설치합니다.

### 1. Node.js 22 LTS 설치

```bash
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc   # 또는 터미널 재시작

fnm install 22
fnm use 22
fnm default 22

node --version  # v22.x.x 확인
```

### 2. pnpm 설치

```bash
npm install -g pnpm
pnpm --version  # 확인
```

### 3. 시스템 패키지 설치

```bash
sudo apt update
sudo apt install -y git curl ripgrep python3 jq build-essential
```

### 4. 레포 클론 및 빌드

```bash
git clone <your-repo-url> paperclip
cd paperclip

pnpm install
pnpm build
```

> 빌드는 처음 한 번만 필요합니다. 약 3~5분 소요됩니다.

### 5. PostgreSQL 설치 (선택 — 내장 DB 사용 시 생략)

기본적으로 **내장 PostgreSQL**이 자동으로 실행됩니다. 별도 설치 없이 바로 사용 가능합니다.

외부 PostgreSQL을 쓰고 싶은 경우에만 아래를 진행하세요:

```bash
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER paperclip WITH PASSWORD 'paperclip';"
sudo -u postgres psql -c "CREATE DATABASE paperclip OWNER paperclip;"
```

### 6. 환경변수 설정

```bash
cd paperclip

cat > .env << EOF
# 필수
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
PAPERCLIP_PUBLIC_URL=http://$(hostname -I | awk '{print $1}'):3100

# 선택 — 외부 PostgreSQL 사용 시만 추가
# DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip

# 선택 — 서버를 외부에서 접근 가능하게 하려면
PAPERCLIP_DEPLOYMENT_EXPOSURE=private
EOF
```

### 7. 서버 실행

```bash
cd paperclip/server
node -r dotenv/config dist/index.js
```

또는 루트에서:

```bash
cd paperclip
node -e "require('dotenv').config(); require('./server/dist/index.js')"
```

브라우저에서 `http://<서버IP>:3100` 접속 확인.

---

## Ollama 로컬 LLM 연결

### 1. Ollama 서비스 외부 접근 허용

Ollama가 로컬에서만 열려 있다면 Paperclip이 접근할 수 있도록 수정합니다.

```bash
# /etc/systemd/system/ollama.service 수정
sudo systemctl edit ollama
```

열린 편집기에 아래 내용 추가:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
```

저장 후 재시작:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama

# 확인
curl http://localhost:11434/api/tags
```

### 2. 모델 준비

서버 스펙에 맞는 모델을 선택하세요:

| 모델 | 크기 | 최소 RAM | 특징 |
|------|------|---------|------|
| `qwen2.5-coder:7b` | ~5GB | 8GB | 코딩 특화, 가벼움 |
| `qwen2.5-coder:32b` | ~20GB | 24GB | 코딩 특화, 강력 |
| `deepseek-coder-v2:16b` | ~9GB | 16GB | 코딩 특화, 균형 |
| `llama3.1:8b` | ~5GB | 8GB | 범용, 가벼움 |
| `mistral:7b` | ~4GB | 8GB | 범용, 가장 가벼움 |

```bash
# 예시 (8GB RAM 환경)
ollama pull qwen2.5-coder:7b

# 확인
ollama list
```

### 3. Paperclip에서 어댑터 추가

브라우저에서 Paperclip UI 접속 후:

1. 계정 생성 및 로그인
2. 좌측 사이드바 → **Settings** → **Adapters**
3. **Add Adapter** 클릭
4. 타입: **opencode_local** 선택
5. 아래 설정 입력:

```
Model: ollama/qwen2.5-coder:7b
```

> `ollama/` 접두사가 중요합니다. OpenCode가 Ollama 엔드포인트로 라우팅합니다.

6. **Save** → **Test Connection** 으로 동작 확인

#### 사용 가능한 Ollama 모델 확인

```bash
# 설치된 모델 목록
ollama list

# OpenCode 형식: ollama/<모델명>
# 예: ollama/qwen2.5-coder:7b, ollama/llama3.1:8b
```

### 4. 에이전트에 어댑터 적용

1. **Agents** 페이지로 이동
2. 에이전트 생성 또는 선택
3. Adapter: 방금 추가한 **opencode_local** 선택
4. 저장

---

## Cloudflare Tunnel로 외부 접속

포트 개방이나 공인 IP 없이 인터넷 어디서나 접속할 수 있게 합니다.

### Quick Tunnel (즉시 사용, URL 매번 변경)

도메인·계정 없이 바로 사용 가능합니다. 단, 재시작할 때마다 URL이 바뀝니다.

#### cloudflared 설치

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
cloudflared --version
```

#### Docker Compose로 실행

```bash
# Paperclip + Quick Tunnel 함께 시작
docker compose -f docker/docker-compose.yml -f docker/docker-compose.tunnel.yml up -d

# 터널 URL 확인 (logs에서 https://xxxx.trycloudflare.com 찾기)
docker compose -f docker/docker-compose.tunnel.yml logs cloudflared
```

출력 예시:
```
cloudflared  | Your quick Tunnel has been created! Visit it at:
cloudflared  | https://banana-windows-cheese-abc.trycloudflare.com
```

이 URL을 Electron 앱 / Android 앱의 서버 주소로 설정합니다.

#### 직접 설치 방식으로 실행

```bash
chmod +x scripts/start-tunnel.sh
./scripts/start-tunnel.sh
```

---

### Named Tunnel (URL 고정, Cloudflare 계정 + 도메인 필요)

재시작해도 URL이 바뀌지 않아 앱 설정을 한 번만 하면 됩니다.

> **필요 조건:** Cloudflare 계정(무료) + Cloudflare에 등록된 도메인

#### 1. 로그인 및 터널 생성

```bash
cloudflared login          # 브라우저 인증 (서버에 GUI 없으면 URL 복사해서 로컬에서 인증)
cloudflared tunnel create paperclip
cloudflared tunnel list    # 생성된 터널 ID 확인
```

#### 2. DNS 레코드 연결

```bash
# paperclip.yourdomain.com → 터널로 연결
cloudflared tunnel route dns paperclip paperclip.yourdomain.com
```

#### 3. 터널 토큰 발급

```bash
cloudflared tunnel token paperclip
# 출력된 토큰(eyJ...) 복사
```

#### 4. 실행

```bash
# Docker Compose
CLOUDFLARE_TUNNEL_TOKEN=eyJ... \
PAPERCLIP_PUBLIC_URL=https://paperclip.yourdomain.com \
docker compose -f docker/docker-compose.yml -f docker/docker-compose.tunnel.yml up -d

# 직접 설치 방식
CLOUDFLARE_TUNNEL_TOKEN=eyJ... ./scripts/start-tunnel.sh
```

#### 5. .env에 저장 (편의)

```bash
echo "CLOUDFLARE_TUNNEL_TOKEN=eyJ..." >> .env
echo "PAPERCLIP_PUBLIC_URL=https://paperclip.yourdomain.com" >> .env
```

---

### 방식 비교

| | Quick Tunnel | Named Tunnel |
|---|---|---|
| 계정 필요 | ❌ 불필요 | ✅ 무료 계정 |
| 도메인 필요 | ❌ 불필요 | ✅ 필요 |
| URL 고정 | ❌ 매번 변경 | ✅ 고정 |
| 설정 난이도 | 매우 쉬움 | 보통 |
| 용도 | 테스트 / 임시 | 실사용 권장 |

---

## Electron 앱 / Android 앱 연결

앱에서 서버 주소를 변경해 리눅스 서버에 연결할 수 있습니다.

### Electron 앱 (데스크톱)

앱 실행 후 로그인 화면에서:
- 서버 URL: `http://<리눅스서버IP>:3100`

또는 앱 설정에서 서버 주소 변경.

### Android 앱

앱 설정에서:
- API Base URL: `http://<리눅스서버IP>:3100`

> **같은 네트워크**에 있어야 합니다. 외부 접근이 필요하면 [방화벽 설정](#방화벽-설정)과 함께 공인 IP 또는 도메인을 사용하세요.

---

## systemd 서비스 등록 (자동 시작)

직접 설치(방법 B) 사용 시, 서버가 재부팅 후에도 자동 실행되도록 설정합니다.

```bash
sudo tee /etc/systemd/system/paperclip.service << EOF
[Unit]
Description=Paperclip AI Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/paperclip
EnvironmentFile=$HOME/paperclip/.env
ExecStart=$(which node) server/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable paperclip
sudo systemctl start paperclip

# 상태 확인
sudo systemctl status paperclip
journalctl -u paperclip -f
```

---

## 방화벽 설정

```bash
# Paperclip 서버 포트 개방
sudo ufw allow 3100/tcp

# (선택) Ollama 포트 — 같은 서버에서 실행 시 불필요
# sudo ufw allow 11434/tcp

# 방화벽 활성화
sudo ufw enable
sudo ufw status
```

> **보안 주의:** `3100` 포트를 공인 인터넷에 직접 노출하기보다는 Tailscale, WireGuard, 또는 리버스 프록시(Nginx + HTTPS) 사용을 권장합니다.

### Nginx 리버스 프록시 (HTTPS, 선택)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/paperclip << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/paperclip /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS 인증서 (도메인 있을 경우)
sudo certbot --nginx -d yourdomain.com
```

---

## 트러블슈팅

### 서버가 시작되지 않는 경우

```bash
# Docker 사용 시
docker compose -f docker/docker-compose.yml logs server

# 직접 설치 시
journalctl -u paperclip -n 50
```

### Ollama 연결 실패

```bash
# Ollama 서비스 상태 확인
systemctl status ollama

# API 응답 확인
curl http://localhost:11434/api/tags

# 모델이 있는지 확인
ollama list

# 없으면 pull
ollama pull qwen2.5-coder:7b
```

### 포트 충돌

```bash
# 3100 포트 사용 중인 프로세스 확인
sudo lsof -i :3100

# Docker 사용 시 포트 변경 (.env에 추가)
PAPERCLIP_PORT=3200
```

### 빌드 오류 (방법 B)

```bash
# Node.js 버전 확인 (22 이상 필요)
node --version

# pnpm 캐시 정리 후 재시도
pnpm store prune
pnpm install --force
pnpm build
```

### 데이터베이스 마이그레이션 오류

```bash
# 외부 PostgreSQL 사용 시 연결 확인
psql $DATABASE_URL -c "SELECT 1"
```

---

## 빠른 참조

| 항목 | 값 |
|------|-----|
| 서버 포트 | `3100` |
| Ollama 포트 | `11434` |
| 데이터 저장 경로 | `~/.paperclip/` (직접 설치) |
| 설정 파일 | `~/.paperclip/instances/default/config.json` |
| 로그 위치 | `~/.paperclip/instances/default/logs/` |
| Ollama 모델 형식 | `ollama/<모델명>` (예: `ollama/qwen2.5-coder:7b`) |
