import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '플랜두씨 | 나의 시간을 돌아보다', description: '계획에서 실행으로, 돌아봄에서 다음 계획으로 이어지는 다이어리' };
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="ko"><body>{children}</body></html>; }
