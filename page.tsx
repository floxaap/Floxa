'use client';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard'; import ProfileView from '@/components/ProfileView';
function View() { return <ProfileView uid={useParams<{ uid: string }>().uid} />; }
export default function Page() { return <AuthGuard><View /></AuthGuard>; }
