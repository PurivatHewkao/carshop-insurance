import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { UserRound } from 'lucide-react';

export type StackingNavbarItem = {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

type StackingNavbarProps = {
  items: StackingNavbarItem[];
  error?: string;
};

export function StackingNavbar({ items, error }: StackingNavbarProps) {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const reducedMotion = useReducedMotion();
  const location = useLocation();
  const [openedAt, setOpenedAt] = useState(location.key);
  const isOpen = expanded && openedAt === location.key;

  useEffect(() => {
    if (!isOpen) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setExpanded(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [isOpen]);

  return (
    <div
      ref={root}
      className="stacking-navbar"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setExpanded(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setExpanded(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="account-trigger"
        aria-label="เมนูบัญชี"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          setOpenedAt(location.key);
          setExpanded(!isOpen);
        }}
      >
        <UserRound size={21} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            id={panelId}
            aria-label="เมนูบัญชีผู้ใช้"
            className="account-stack"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
          >
            {items.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{
                  x: reducedMotion ? 0 : -16 * index,
                  y: reducedMotion ? 0 : -12 * index,
                }}
                animate={{ x: 0, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 320,
                  damping: 28,
                  delay: reducedMotion ? 0 : index * 0.06,
                }}
                style={{ zIndex: items.length - index }}
              >
                {item.href ? (
                  <Link
                    className="account-stack-item"
                    to={item.href}
                    onClick={() => setExpanded(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="account-stack-item"
                    onClick={item.onClick}
                    disabled={item.disabled}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )}
              </motion.div>
            ))}
            {error && (
              <p className="account-stack-error" role="alert">
                {error}
              </p>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
