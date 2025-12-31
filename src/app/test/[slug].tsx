'use client';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
export default function TestSlug() {
  const params = useParams();
  useEffect(() => {
  }, [params]);
  return <div>slug: {String(params.slug)}</div>;
}
