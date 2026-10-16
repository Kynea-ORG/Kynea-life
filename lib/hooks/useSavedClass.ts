'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import * as analytics from '@/lib/analytics';
import type { DanceClass } from '@/lib/types';

export interface UseSavedClassOptions {
  cls: Pick<DanceClass, 'id' | 'title' | 'style'> & {
    teacher?: { id: string };
  };
  initialSaved?: boolean;
  requireAuth?: boolean;
}

export function useSavedClass({
  cls,
  initialSaved = false,
  requireAuth = false,
}: UseSavedClassOptions) {
  let router: { push: (url: string) => void } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }

  const { user } = useAuth();
  const [saved, setSaved] = useState<boolean>(initialSaved);
  const isPendingRef = useRef(false);

  // Reset saved state if user logs out
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    if (!user) {
      setSaved(false);
    }
  }

  // Sync initial state from Supabase if user is logged in
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const supabase = createClient();
    supabase
      .from('saved_classes')
      .select('class_id')
      .eq('user_id', user.id)
      .eq('class_id', cls.id)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (isMounted && data) {
            setSaved(true);
          }
        },
        () => {
          // Ignore query failure gracefully
        }
      );

    return () => {
      isMounted = false;
    };
  }, [cls.id, user]);

  // Synchronize across cards / components on the same page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleGlobalChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ classId: string; saved: boolean }>;
      if (customEvent.detail && customEvent.detail.classId === cls.id) {
        setSaved(customEvent.detail.saved);
      }
    };

    window.addEventListener('kynea:class-saved-change', handleGlobalChange);
    return () => {
      window.removeEventListener('kynea:class-saved-change', handleGlobalChange);
    };
  }, [cls.id]);

  const toggleSave = useCallback(
    async (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (requireAuth && !user) {
        if (typeof analytics.trackAuthCtaClick === 'function') {
          analytics.trackAuthCtaClick({ action: 'login', location: 'save_class_gate' });
        }
        if (router) {
          router.push('/login');
        }
        return;
      }

      if (isPendingRef.current) return;
      isPendingRef.current = true;

      const previousSaved = saved;
      const nextSaved = !previousSaved;

      // 1. Optimistic feedback: update UI state in <10ms
      setSaved(nextSaved);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('kynea:class-saved-change', {
            detail: { classId: cls.id, saved: nextSaved },
          })
        );
      }

      if (nextSaved && typeof analytics.trackSaveClass === 'function') {
        analytics.trackSaveClass({
          classId: cls.id,
          className: cls.title,
          classStyle: cls.style,
          teacherId: cls.teacher?.id ?? '',
        });
      }

      // If user is not logged in (e.g. browsing catalog anonymously), keep optimistic local toggle
      if (!user) {
        isPendingRef.current = false;
        return;
      }

      // 2. Background sync with Supabase for logged-in user
      try {
        const supabase = createClient();
        if (!nextSaved) {
          const { error } = await supabase
            .from('saved_classes')
            .delete()
            .eq('user_id', user.id)
            .eq('class_id', cls.id);

          if (error) {
            // Rollback on failure
            setSaved(previousSaved);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('kynea:class-saved-change', {
                  detail: { classId: cls.id, saved: previousSaved },
                })
              );
            }
          }
        } else {
          const { error } = await supabase
            .from('saved_classes')
            .insert({ user_id: user.id, class_id: cls.id });

          // 23505 = unique constraint violation (already saved elsewhere), treat as success
          if (error && error.code !== '23505') {
            // Rollback on failure
            setSaved(previousSaved);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('kynea:class-saved-change', {
                  detail: { classId: cls.id, saved: previousSaved },
                })
              );
            }
          }
        }
      } catch {
        // Rollback on network failure
        setSaved(previousSaved);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('kynea:class-saved-change', {
              detail: { classId: cls.id, saved: previousSaved },
            })
          );
        }
      } finally {
        isPendingRef.current = false;
      }
    },
    [user, saved, cls, requireAuth, router]
  );

  return {
    saved,
    toggleSave,
  };
}
