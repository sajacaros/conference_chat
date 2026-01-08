# Conference Chat Frontend

React + Vite 기반 1:1 영상통화 프론트엔드

## 기술 스택

- React 19, TypeScript, Vite 7
- React Router 7, Tailwind CSS 3
- WebRTC (native), SSE (native EventSource)

## 실행 방법

### 개발 서버

```bash
npm install
npm run dev
```
http://localhost:9087

### 프로덕션 (pm2)

```bash
# 빌드
npm run build

# pm2로 실행
pm2 start "npm run preview -- --host" --name frontend

# 상태 확인
pm2 list

# 로그 확인
pm2 logs frontend

# 중지
pm2 stop frontend

# 재시작
pm2 restart frontend

# 삭제
pm2 delete frontend
```

### 환경 변수

- `.env.development`: `VITE_API_URL=http://localhost:9088`
- `.env.production`: `VITE_API_URL=/conference-api`

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (port 9087) |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 실행 |
