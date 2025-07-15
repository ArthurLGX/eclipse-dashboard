'use client';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
export default function TestSlug() {
  const params = useParams();
  useEffect(() => {
    console.log(params);
  }, [params]);
  return <div>slug: {String(params.slug)}</div>;
}
