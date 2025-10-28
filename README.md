# SIU OTP API (Vercel Serverless)

이메일 6자리 인증(OTP) 발송/검증을 위한 Vercel 서버리스 함수입니다.
프런트(깃허브 페이지)에서 Firebase Auth 로그인 후 idToken으로 호출하세요.

## Endpoints
- `POST /api/send-otp`  
  헤더: `Authorization: Bearer <idToken>`  
  응답: `{ ok: true, ttlMs: 300000 }`

- `POST /api/verify-otp`  
  바디: `{ idToken: "<idToken>", code: "123456" }`  
  응답: `{ ok: true, unlockMinutes: 10 }`

## 환경변수 (Vercel Project Settings → Environment Variables)
- `FIREBASE_PROJECT_ID` = siu-studio
- `FIREBASE_CLIENT_EMAIL` = (서비스계정 client_email)
- `FIREBASE_PRIVATE_KEY` = (서비스계정 private_key; 줄바꿈은 \n 유지)
- `FIREBASE_DATABASE_URL` = https://siu-studio-default-rtdb.asia-southeast1.firebasedatabase.app
- `RESEND_API_KEY` = re_************************
- `EMAIL_FROM` = SIU Studio <no-reply@your-domain.com>
- `ALLOWED_ORIGIN` = https://siustudio.kro.kr, https://siustudio.github.io
- `OTP_PEPPER` = (아무도 모르는 긴 랜덤 문자열)

## 배포
1. 이 리포를 Vercel에 연결 후 배포
2. 환경변수 설정
3. 배포 도메인: `https://<your-vercel-app>.vercel.app`

## 보안
- OTP 원문은 저장하지 않고 해시+pepper로 저장
- 유효시간 5분, 실패 5회 제한, 재전송 30초 쿨다운
- 추천 RTDB 규칙: `/otp/**`는 읽기/쓰기 금지 (Admin SDK만 접근)
