import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Plus, X, Upload, Tag, CreditCard, Package, Car, Dumbbell, Laptop, Ticket,
  Sofa, Lamp, Grid3x3, User, LogOut, Shirt, NotebookPen, CircleQuestionMark, Footprints,
  MessageCircle, MoreVertical, Trash2, Edit, CheckCircle, Menu, ArrowRight, ArrowLeft,
  MapPin, Camera, Check, CircleParking,
} from 'lucide-react';
import logo from './BruinMarketTransparent.svg';
import Chat from './Chat.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const ORIGIN = API_URL.replace('/api', '');
const asset = (path) => `${ORIGIN}${path}`;

const categories = [
  { name: 'Everything', value: 'all', icon: Grid3x3 },
  { name: 'Clothing', value: 'Clothing', icon: Shirt },
  { name: 'Sports Equipment', value: 'Sports Equipment', icon: Dumbbell },
  { name: 'Shoes', value: 'Shoes', icon: Footprints },
  { name: 'Class Supplies', value: 'Class Supplies', icon: NotebookPen },
  { name: 'Electronics', value: 'Electronics', icon: Laptop },
  { name: 'Tickets', value: 'Tickets', icon: Ticket },
  { name: 'Swipes', value: 'Swipes', icon: CreditCard },
  { name: 'Rideshare', value: 'Rideshare', icon: Car },
  { name: 'Parking Spots', value: 'Parking Spots', icon: CircleParking },
  { name: 'Furniture', value: 'Furniture', icon: Sofa },
  { name: 'Decorations', value: 'Decorations', icon: Lamp },
  { name: 'Other', value: 'Other', icon: CircleQuestionMark },
];

const CONDITIONS = ['New', 'Used - like New', 'Used - Good', 'Used - Poor'];
const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];

const iconFor = (value) => (categories.find((c) => c.value === value) || {}).icon || Tag;

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const secs = Math.floor((now - date) / 1000);
  if (secs < 60) return 'JUST NOW';
  if (secs < 3600) return `${Math.floor(secs / 60)}M AGO`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}H AGO`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}D AGO`;
  return date
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
    .toUpperCase();
};

const priceLabel = (price) =>
  Number(price) === 0 ? 'FREE' : `$${Number(price).toLocaleString('en-US')}`;

/* ============================================================
   Primitives
   ============================================================ */

const Brand = ({ onClick, compact }) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-2.5 text-left"
    aria-label="BruinMarket home"
  >
    <img
      src={logo}
      alt=""
      className="h-8 w-8 shrink-0 brightness-0 invert transition-transform duration-500 group-hover:rotate-[-8deg] md:h-9 md:w-9"
    />
    <div className="min-w-0 leading-none">
      <div className="type-head truncate text-[15px] md:text-[17px]">
        Bruin<span className="text-sun">Market</span>
      </div>
      {!compact && <div className="meta mt-1 hidden truncate md:block">UCLA · Westwood</div>}
    </div>
  </button>
);

const Avatar = ({ url, name, size = 32, onClick, ring }) => {
  const px = { width: size, height: size };
  const cls = `relative shrink-0 overflow-hidden rounded-full bg-raised ${
    ring ? 'ring-1 ring-line' : ''
  } ${onClick ? 'cursor-pointer transition-all hover:ring-2 hover:ring-sun' : ''}`;
  if (url) {
    return (
      <img
        src={asset(url)}
        alt={name || ''}
        style={px}
        onClick={onClick}
        className={`${cls} object-cover`}
      />
    );
  }
  return (
    <div style={px} onClick={onClick} className={`${cls} flex items-center justify-center`}>
      <span className="num text-[11px] font-bold text-dim">
        {(name || '?').trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

const Field = ({ label, hint, children, required }) => (
  <label className="block">
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="meta">
        {label}
        {required && <span className="text-sun"> *</span>}
      </span>
      {hint && <span className="meta normal-case tracking-normal">{hint}</span>}
    </div>
    {children}
  </label>
);

const Segmented = ({ options, value, onChange }) => (
  <div className="grid grid-cols-2 gap-px border border-line bg-line">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors ${
            active
              ? opt.tone === 'blue'
                ? 'bg-royal text-white'
                : 'bg-sun text-abyss'
              : 'bg-panel text-ash hover:bg-raised hover:text-chalk'
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

/* Shared modal chrome. Locks scroll, closes on Escape, animates in. */
let sheetCount = 0;
const Sheet = ({ label, title, onClose, children, size = 'md', headerRight }) => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10);
    sheetCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      sheetCount = Math.max(0, sheetCount - 1);
      if (sheetCount === 0) document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const width = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }[size];

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-abyss/85 p-3 pt-14 backdrop-blur-[3px] transition-opacity duration-300 md:items-center md:p-6 md:pt-6 ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full ${width} border border-line bg-panel transition-all duration-300 ease-out ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line bg-panel px-5 py-3.5">
          <div className="min-w-0">
            {label && <div className="meta mb-1.5">{label}</div>}
            <h2 className="type-head truncate text-lg md:text-xl">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center border border-line text-ash transition-colors hover:border-ember hover:bg-ember hover:text-abyss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ============================================================
   Listings
   ============================================================ */

const TypeTag = ({ type }) => (
  <span
    className={`meta-hi px-2 py-1 ${
      type === 'selling' ? 'bg-sun text-abyss' : 'bg-royal-light text-abyss'
    }`}
  >
    {type === 'selling' ? 'For Sale' : 'Wanted'}
  </span>
);

const PostCard = ({ post, onDelete, onEdit, onMarkAsSold, canDelete, token, onMessageUser, onViewUserProfile }) => {
  const [open, setOpen] = useState(false);
  const Icon = iconFor(post.category);
  const media = post.media && post.media.length > 0 ? post.media[0] : null;

  return (
    <>
      <article className="group relative flex flex-col border-b border-r border-line bg-panel transition-colors duration-300 hover:bg-raised">
        {/* yellow rule draws itself across the top on hover */}
        <span className="sweep absolute inset-x-0 top-0 z-10 h-[2px] bg-sun" />

        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sun"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-[#002A42]">
            {media ? (
              media.type.startsWith('image/') ? (
                <img
                  src={asset(media.url)}
                  alt={post.title}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05] ${
                    post.sold ? 'opacity-40 grayscale' : ''
                  }`}
                />
              ) : (
                <video
                  src={asset(media.url)}
                  muted
                  playsInline
                  className={`h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05] ${
                    post.sold ? 'opacity-40 grayscale' : ''
                  }`}
                />
              )
            ) : (
              <div className="blueprint flex h-full w-full flex-col items-center justify-center gap-3">
                <Icon size={34} strokeWidth={1.25} className="text-[#2F87B0]" />
                <span className="meta text-[#2F87B0]">{post.category}</span>
                <span className="meta absolute bottom-2 right-2 text-[#226E96]">No photo</span>
              </div>
            )}

            <div className="absolute left-0 top-0 flex items-center gap-px">
              <TypeTag type={post.type} />
            </div>

            {post.media && post.media.length > 1 && (
              <div className="meta-hi absolute bottom-0 right-0 bg-abyss/80 px-2 py-1">
                +{post.media.length - 1}
              </div>
            )}

            {post.sold && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                <div className="hazard h-1.5 w-full opacity-90" />
                <div className="flex justify-center bg-ember py-1.5">
                  <span className="meta-hi text-abyss">Sold</span>
                </div>
                <div className="hazard h-1.5 w-full opacity-90" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col p-4">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-chalk">
              {post.title}
            </h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="meta">{post.category}</span>
              {post.type === 'selling' && post.condition && (
                <>
                  <span className="text-[10px] text-line">/</span>
                  <span className="meta">{post.condition}</span>
                </>
              )}
            </div>

            {post.location && (
              <div className="mt-2 flex items-center gap-1.5 text-dim">
                <MapPin size={11} strokeWidth={2} />
                <span className="meta truncate normal-case tracking-normal">{post.location}</span>
              </div>
            )}

            <div className="mt-4 flex items-end justify-between gap-2 pt-1">
              <div>
                <div className="meta mb-1.5">{post.type === 'buying' ? 'Will pay' : 'Asking'}</div>
                <div
                  className={`num text-[26px] font-bold leading-none ${
                    post.sold ? 'text-dim line-through' : 'text-sun'
                  }`}
                >
                  {priceLabel(post.price)}
                </div>
              </div>
              <ArrowRight
                size={18}
                className="mb-1 -translate-x-1 text-dim opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-sun group-hover:opacity-100"
              />
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
          <Avatar url={post.user_profile_picture_url} name={post.user_name} size={22} />
          <span className="meta flex-1 truncate normal-case tracking-normal text-ash">
            {post.user_name}
          </span>
          <span className="meta shrink-0">{formatDate(post.created_at)}</span>
        </div>
      </article>

      {open && (
        <PostFullView
          post={post}
          token={token}
          onClose={() => setOpen(false)}
          onMessageUser={onMessageUser}
          onViewUserProfile={onViewUserProfile}
          onDelete={onDelete}
          onEdit={onEdit}
          onMarkAsSold={onMarkAsSold}
          canDelete={canDelete}
        />
      )}
    </>
  );
};

const PostGrid = ({ children }) => (
  <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    {children}
  </div>
);

const CardSkeleton = () => (
  <div className="border-b border-r border-line bg-panel">
    <div className="shimmer aspect-[4/3] bg-[#002E47]" />
    <div className="space-y-3 p-4">
      <div className="shimmer h-3.5 w-4/5 bg-[#0A4F72]" />
      <div className="shimmer h-2.5 w-1/3 bg-[#0A4F72]" />
      <div className="shimmer h-6 w-1/2 bg-[#0A4F72]" />
    </div>
    <div className="shimmer h-10 border-t border-line bg-[#002E47]" />
  </div>
);

const EmptyState = ({ title, body, action }) => (
  <div className="brackets relative border border-line bg-panel px-6 py-20 text-center">
    <div className="blueprint pointer-events-none absolute inset-0 opacity-60" />
    <div className="relative">
      <Package size={40} strokeWidth={1} className="mx-auto mb-5 text-[#1E6B93]" />
      <h3 className="type-head text-lg text-chalk">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-dim">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  </div>
);

const PostFullView = ({
  post, token, onClose, onMessageUser, onViewUserProfile, onDelete, onEdit, onMarkAsSold, canDelete,
}) => {
  const [index, setIndex] = useState(0);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const hasMedia = post.media && post.media.length > 0;
  const Icon = iconFor(post.category);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    if (menu) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menu]);

  const current = hasMedia ? post.media[index] : null;

  return (
    <Sheet
      label={post.type === 'selling' ? 'Listing' : 'Wanted'}
      title={post.title}
      onClose={onClose}
      size="xl"
      headerRight={
        canDelete ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label="Post actions"
              className="flex h-9 w-9 items-center justify-center border border-line text-ash transition-colors hover:border-edge hover:text-chalk"
            >
              <MoreVertical size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 top-11 z-30 w-52 border border-line bg-panel">
                <button
                  onClick={() => { setMenu(false); onEdit(); onClose(); }}
                  className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left text-[13px] text-chalk transition-colors hover:bg-raised"
                >
                  <Edit size={15} className="text-sun" /> Edit listing
                </button>
                {onMarkAsSold && (
                <button
                  onClick={() => {
                    setMenu(false);
                    const q = post.sold ? 'Unmark this post as sold?' : 'Mark this post as sold?';
                    if (window.confirm(q)) onMarkAsSold(post.id, !post.sold);
                  }}
                  className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left text-[13px] text-chalk transition-colors hover:bg-raised"
                >
                  <CheckCircle size={15} className="text-mint" />
                  {post.sold ? 'Unmark as sold' : 'Mark as sold'}
                </button>
                )}
                <button
                  onClick={() => {
                    setMenu(false);
                    if (window.confirm('Delete this post permanently?')) {
                      onDelete(post.id);
                      onClose();
                    }
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-ember transition-colors hover:bg-ember hover:text-abyss"
                >
                  <Trash2 size={15} /> Delete listing
                </button>
              </div>
            )}
          </div>
        ) : null
      }
    >
      <div className="grid max-h-[calc(100vh-12rem)] grid-cols-1 overflow-y-auto md:max-h-[78vh] md:grid-cols-[1.15fr_1fr] md:overflow-hidden">
        {/* Media */}
        <div className="flex flex-col border-b border-line bg-[#002A42] md:border-b-0 md:border-r">
          <div className="relative flex h-64 items-center justify-center overflow-hidden md:h-auto md:flex-1 md:min-h-[420px]">
            {current ? (
              <>
                <div
                  aria-hidden
                  className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl"
                  style={{ backgroundImage: `url(${asset(current.url)})` }}
                />
                {current.type.startsWith('image/') ? (
                  <img
                    src={asset(current.url)}
                    alt={post.title}
                    className="relative max-h-full max-w-full object-contain"
                  />
                ) : (
                  <video src={asset(current.url)} controls className="relative max-h-full max-w-full" />
                )}
              </>
            ) : (
              <div className="blueprint flex h-full w-full items-center justify-center">
                <Icon size={56} strokeWidth={0.75} className="text-[#1E6B93]" />
              </div>
            )}

            {post.sold && (
              <div className="absolute left-0 top-6 flex items-center gap-2 bg-ember px-3 py-1.5">
                <span className="meta-hi text-abyss">Sold</span>
              </div>
            )}
          </div>

          {hasMedia && post.media.length > 1 && (
            <div className="flex gap-px overflow-x-auto border-t border-line bg-panel p-px">
              {post.media.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden bg-[#002A42] transition-opacity ${
                    i === index ? 'opacity-100' : 'opacity-45 hover:opacity-80'
                  }`}
                >
                  {m.type.startsWith('image/') ? (
                    <img src={asset(m.url)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={asset(m.url)} className="h-full w-full object-cover" />
                  )}
                  {i === index && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-sun" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="flex flex-col md:overflow-y-auto">
          <div className="border-b border-line p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="meta mb-2">{post.type === 'buying' ? 'Willing to pay' : 'Asking'}</div>
                <div
                  className={`num text-[44px] font-bold leading-none ${
                    post.sold ? 'text-dim line-through' : 'text-sun'
                  }`}
                >
                  {priceLabel(post.price)}
                </div>
              </div>
              <TypeTag type={post.type} />
            </div>

            <div className="mt-5 flex w-fit flex-wrap gap-px bg-line">
              <span className="meta-hi flex items-center gap-2 bg-panel px-3 py-2">
                <Tag size={12} className="text-sun" />
                {post.category}
              </span>
              {post.type === 'selling' && post.condition && (
                <span className="meta-hi bg-panel px-3 py-2">{post.condition}</span>
              )}
              <span className="meta bg-panel px-3 py-2">{formatDate(post.created_at)}</span>
            </div>
          </div>

          <div className="border-b border-line p-5">
            <div className="meta mb-3">Description</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ash">{post.description}</p>
            {post.location && (
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-ash">
                <MapPin size={14} className="text-sun" />
                <span className="text-sm">{post.location}</span>
              </div>
            )}
          </div>

          <div className="border-b border-line p-5">
            <div className="meta mb-3">Trading safely</div>
            <ul className="space-y-2">
              {[
                'Meet somewhere public — Bruin Plaza, the Powell steps, a dorm lobby.',
                'BruinMarket never touches payment. Settle in person, cash or Venmo.',
                'Every account here is a verified @ucla.edu address.',
              ].map((tip) => (
                <li key={tip} className="flex gap-2.5 text-xs leading-relaxed text-dim">
                  <span className="mt-[7px] h-px w-2.5 shrink-0 bg-sun" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex items-center gap-3 bg-[#002A42] p-5">
            <Avatar
              url={post.user_profile_picture_url}
              name={post.user_name}
              size={44}
              ring
              onClick={onViewUserProfile ? () => { onViewUserProfile(post.user_id); onClose(); } : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="meta mb-1">Posted by</div>
              <button
                onClick={() => { if (onViewUserProfile) { onViewUserProfile(post.user_id); onClose(); } }}
                className="truncate text-sm font-semibold text-chalk transition-colors hover:text-sun"
              >
                {post.user_name}
              </button>
            </div>
            {onMessageUser && (
              <button
                onClick={() => { onMessageUser(post.user_id); onClose(); }}
                className="btn btn-sun"
              >
                <MessageCircle size={16} />
                Message
              </button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
};

/* ============================================================
   Compose / edit — one form, two modes
   ============================================================ */

const PostComposer = ({ mode, post, onClose, onSubmit, categories: cats, token }) => {
  const [form, setForm] = useState({
    title: post?.title || '',
    description: post?.description || '',
    price: post?.price ?? '',
    category: post?.category || cats[0].value,
    type: post?.type || 'selling',
    location: post?.location || '',
    condition: post?.condition || '',
    media: post?.media ? post.media.map((m) => ({ url: m.url, type: m.type })) : [],
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024;
    setUploading(true);

    for (const file of files) {
      if (file.size > maxSize) {
        setError(`${file.name} is larger than 10MB.`);
        continue;
      }
      try {
        const body = new FormData();
        body.append('file', file);
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        setForm((prev) => ({ ...prev, media: [...prev.media, { url: data.url, type: data.type }] }));
      } catch (err) {
        console.error('Error uploading file:', err);
        setError(`Failed to upload ${file.name}.`);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const removeMedia = (index) =>
    setForm((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));

  const handleSubmit = async () => {
    setError('');
    if (!form.title || !form.description || form.price === '') {
      setError('Title, description and price are required.');
      return;
    }
    if (form.type === 'selling' && !form.condition) {
      setError('Pick a condition for items you are selling.');
      return;
    }
    if (parseFloat(form.price) < 0) {
      setError('Price cannot be negative.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      // parent surfaces its own failure message
    } finally {
      setSaving(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Sheet
      label={isEdit ? 'Edit' : 'New listing'}
      title={isEdit ? 'Edit your post' : 'Post to the market'}
      onClose={onClose}
      size="md"
    >
      <div className="max-h-[calc(100vh-10rem)] overflow-y-auto md:max-h-[74vh]">
        <div className="space-y-6 p-5">
          {error && (
            <div className="flex items-start gap-2 border border-ember/40 bg-ember/10 px-3 py-2.5 text-[13px] text-ember">
              <X size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Field label="I am" required>
            <Segmented
              value={form.type}
              onChange={(type) =>
                set({ type, condition: type === 'selling' ? form.condition : '' })
              }
              options={[
                { value: 'selling', label: 'Selling' },
                { value: 'buying', label: 'Looking to buy', tone: 'blue' },
              ]}
            />
          </Field>

          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Rose Bowl student ticket, section 8"
              className="field"
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Category" required>
              <select
                value={form.category}
                onChange={(e) => set({ category: e.target.value })}
                className="field field-select"
              >
                {cats.map((c) => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label={form.type === 'buying' ? 'Willing to pay' : 'Price'} required hint="0 = free">
              <div className="relative">
                <span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sun">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => set({ price: e.target.value })}
                  placeholder="0.00"
                  className="field num pl-7"
                />
              </div>
            </Field>
          </div>

          {form.type === 'selling' && (
            <Field label="Condition" required>
              <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
                {CONDITIONS.map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => set({ condition })}
                    className={`px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                      form.condition === condition
                        ? 'bg-sun text-abyss'
                        : 'bg-panel text-ash hover:bg-raised hover:text-chalk'
                    }`}
                  >
                    {condition.replace('Used - ', '')}
                    {condition.startsWith('Used') && (
                      <span className="block text-[9px] font-normal opacity-60">used</span>
                    )}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="Pickup spot" hint="optional">
            <input
              type="text"
              value={form.location}
              onChange={(e) => set({ location: e.target.value })}
              placeholder="Hedrick Hall, Rieber Vista, 433 Midvale…"
              className="field"
            />
          </Field>

          <Field label="Description" required>
            <textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder={form.type === 'buying' ? 'What are you after?' : 'Condition, size, why you are selling…'}
              rows={5}
              className="field resize-none"
            />
          </Field>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="meta">Photos & video</span>
              <span className="meta normal-case tracking-normal">10MB max each</span>
            </div>

            <div className="brackets relative border border-line bg-[#002A42]">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
                id="composer-media"
                disabled={uploading}
              />
              <label
                htmlFor="composer-media"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 px-6 py-9 transition-colors hover:bg-panel"
              >
                {uploading ? (
                  <>
                    <div className="relative h-8 w-8 overflow-hidden border border-line">
                      <span className="animate-scan absolute inset-x-0 h-2 bg-sun/70" />
                    </div>
                    <span className="meta">Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} className="text-sun" />
                    <span className="text-sm text-chalk">Drop files or click to browse</span>
                    <span className="meta">Listings with photos sell faster</span>
                  </>
                )}
              </label>
            </div>

            {form.media.length > 0 && (
              <div className="mt-px grid grid-cols-3 gap-px bg-line sm:grid-cols-4">
                {form.media.map((m, i) => (
                  <div key={i} className="group relative aspect-square bg-[#002A42]">
                    {m.type.startsWith('image/') ? (
                      <img src={asset(m.url)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video src={asset(m.url)} className="h-full w-full object-cover" />
                    )}
                    {i === 0 && (
                      <span className="meta-hi absolute left-0 top-0 bg-sun px-1.5 py-0.5 text-abyss">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      aria-label="Remove media"
                      className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center bg-abyss/70 text-chalk opacity-0 transition-opacity hover:bg-ember hover:text-abyss group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-px border-t border-line bg-line">
        <button onClick={onClose} className="btn btn-quiet flex-1 rounded-none bg-panel py-4">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={uploading || saving}
          className="btn btn-sun flex-[2] rounded-none py-4"
        >
          {saving ? 'Saving…' : uploading ? 'Uploading…' : isEdit ? 'Save changes' : 'Publish listing'}
          {!saving && !uploading && <ArrowRight size={16} />}
        </button>
      </div>
    </Sheet>
  );
};

/* ============================================================
   Auth
   ============================================================ */

const AuthModal = ({ onClose, onSuccess, initialIsSignUp = false }) => {
  const [isLogin, setIsLogin] = useState(!initialIsSignUp);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', year: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setIsLogin(!initialIsSignUp);
    setSuccess('');
    setShowResendButton(false);
  }, [initialIsSignUp]);

  const handleResendVerification = async () => {
    setResending(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      if (response.ok) setSuccess('Verification email sent. Check your inbox.');
      else setError(data.error);
    } catch (err) {
      setError('Failed to resend verification email');
    }
    setResending(false);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!isLogin && !formData.year) {
      setError('Please select your year');
      setLoading(false);
      return;
    }
    if (!formData.email.endsWith('@ucla.edu')) {
      setError('BruinMarket is @ucla.edu only');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        setLoading(false);
        return;
      }

      if (isLogin) {
        onSuccess(data.token, data.user);
      } else {
        setSuccess(data.message);
        setShowResendButton(true);
        setFormData({ ...formData, password: '' });
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  const onEnter = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Sheet
      label={isLogin ? 'Returning bruin' : 'New account'}
      title={isLogin ? 'Log in' : 'Join the market'}
      onClose={onClose}
      size="sm"
    >
      <div className="p-5">
        {error && (
          <div className="mb-5 border border-ember/40 bg-ember/10 px-3 py-2.5 text-[13px] text-ember">
            {error}
          </div>
        )}

        {success ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-mint/40 bg-mint/10">
              <Check size={22} className="text-mint" />
            </div>
            <p className="text-sm leading-relaxed text-ash">{success}</p>
            {showResendButton && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="meta mb-3">Nothing in your inbox?</p>
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="btn btn-ghost w-full"
                >
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {!isLogin && (
              <>
                <Field label="Name" required>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onKeyDown={onEnter}
                    placeholder="Josie Bruin"
                    className="field"
                  />
                </Field>
                <Field label="Year" required>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="field field-select"
                  >
                    <option value="">Select year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            <Field label="UCLA email" required hint="@ucla.edu only">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onKeyDown={onEnter}
                placeholder="jbruin@ucla.edu"
                className="field"
              />
            </Field>

            <Field label="Password" required>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onKeyDown={onEnter}
                placeholder="••••••••"
                className="field"
              />
            </Field>

            <button onClick={handleSubmit} disabled={loading} className="btn btn-sun w-full py-3.5">
              {loading ? 'Working…' : isLogin ? 'Log in' : 'Create account'}
              {!loading && <ArrowRight size={16} />}
            </button>

            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
                setShowResendButton(false);
              }}
              className="meta w-full py-1 text-center transition-colors hover:text-sun"
            >
              {isLogin ? 'No account? Sign up →' : '← Already a member? Log in'}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
};

/* ============================================================
   Profiles
   ============================================================ */

const ProfileHeader = ({ user, postCount, children }) => (
  <div className="relative overflow-hidden border border-line bg-panel">
    <div className="blueprint pointer-events-none absolute inset-0 opacity-70" />
    <div className="absolute inset-x-0 top-0 h-[2px] bg-sun" />
    <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center md:p-8">
      {children}
      <div className="min-w-0 flex-1">
        <div className="meta mb-2">Bruin</div>
        <h2 className="type-display text-3xl md:text-4xl">{user.name}</h2>
        <div className="mt-4 flex w-fit flex-wrap items-center gap-px bg-line">
          <span className="meta-hi bg-panel px-3 py-2">{user.year || 'Year not set'}</span>
          <span className="meta-hi bg-panel px-3 py-2">
            <span className="num text-sun">{postCount}</span> Listings
          </span>
        </div>
      </div>
    </div>
  </div>
);

const ProfilePage = ({ user, token, onDeletePost, onEdit, onMarkAsSold }) => {
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [editingYear, setEditingYear] = useState(false);
  const [selectedYear, setSelectedYear] = useState(user.year || '');
  const [updatingYear, setUpdatingYear] = useState(false);

  useEffect(() => { loadMyPosts(); }, []);
  useEffect(() => { setSelectedYear(user.year || ''); }, [user.year]);

  const loadMyPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/my-posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMyPosts(data || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId) => {
    await onDeletePost(postId);
    setMyPosts(myPosts.filter((p) => p.id !== postId));
  };

  const handleMarkAsSold = async (postId, soldStatus) => {
    await onMarkAsSold(postId, soldStatus);
    loadMyPosts();
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_URL}/upload-profile-picture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      user.profile_picture_url = data.url;
      window.location.reload();
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleYearUpdate = async () => {
    if (!selectedYear) {
      alert('Please select a year');
      return;
    }
    setUpdatingYear(true);
    try {
      const response = await fetch(`${API_URL}/auth/year`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update year');
      }
      user.year = selectedYear;
      setEditingYear(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating year:', error);
      alert(error.message || 'Failed to update year');
    } finally {
      setUpdatingYear(false);
    }
  };

  return (
    <div className="animate-rise">
      <div className="relative overflow-hidden border border-line bg-panel">
        <div className="blueprint pointer-events-none absolute inset-0 opacity-70" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-sun" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-start md:p-8">
          <div className="relative shrink-0">
            <div className="h-28 w-28 overflow-hidden border border-line bg-raised">
              {user.profile_picture_url ? (
                <img
                  src={asset(user.profile_picture_url)}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User size={36} strokeWidth={1} className="text-[#2A7FA8]" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-px -right-px flex h-9 w-9 cursor-pointer items-center justify-center bg-sun text-abyss transition-colors hover:bg-sun-soft">
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
                disabled={uploadingPicture}
              />
              {uploadingPicture ? (
                <div className="h-4 w-4 animate-spin border-2 border-ink border-t-transparent" />
              ) : (
                <Camera size={16} />
              )}
            </label>
          </div>

          <div className="min-w-0 flex-1">
            <div className="meta mb-2">Your profile</div>
            <h2 className="type-display text-3xl md:text-[42px]">{user.name}</h2>

            <div className="mt-5">
              {editingYear ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="field field-select w-auto"
                    disabled={updatingYear}
                  >
                    <option value="">Select year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button onClick={handleYearUpdate} disabled={updatingYear} className="btn btn-sun">
                    {updatingYear ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingYear(false); setSelectedYear(user.year || ''); }}
                    disabled={updatingYear}
                    className="btn btn-quiet"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex w-fit flex-wrap items-center gap-px bg-line">
                  <span className="meta-hi bg-panel px-3 py-2">{user.year || 'Year not set'}</span>
                  <span className="meta-hi bg-panel px-3 py-2">
                    <span className="num text-sun">{myPosts.length}</span> Listings
                  </span>
                  <button
                    onClick={() => { setEditingYear(true); setSelectedYear(user.year || ''); }}
                    className="meta flex items-center gap-1.5 bg-panel px-3 py-2 transition-colors hover:text-sun"
                  >
                    <Edit size={11} /> Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SectionHeading title="Your listings" count={myPosts.length} />

      {loading ? (
        <PostGrid>
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </PostGrid>
      ) : myPosts.length === 0 ? (
        <EmptyState
          title="Nothing listed yet"
          body="Your first post takes about thirty seconds. Photos help."
        />
      ) : (
        <PostGrid>
          {myPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              token={token}
              onDelete={handleDelete}
              onEdit={() => onEdit(post)}
              onMarkAsSold={handleMarkAsSold}
              canDelete={true}
            />
          ))}
        </PostGrid>
      )}
    </div>
  );
};

const OtherUserProfile = ({ profileData, token, onClose, onViewUserProfile }) => {
  const { user, posts } = profileData;

  return (
    <div className="animate-rise">
      <button onClick={onClose} className="meta mb-5 flex items-center gap-2 transition-colors hover:text-sun">
        <ArrowLeft size={13} /> Back to market
      </button>

      <ProfileHeader user={user} postCount={posts.length}>
        <div className="h-24 w-24 shrink-0 overflow-hidden border border-line bg-raised">
          {user.profile_picture_url ? (
            <img src={asset(user.profile_picture_url)} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User size={32} strokeWidth={1} className="text-[#2A7FA8]" />
            </div>
          )}
        </div>
      </ProfileHeader>

      <SectionHeading title={`${user.name}'s listings`} count={posts.length} />

      {posts.length === 0 ? (
        <EmptyState title="No listings" body="This bruin hasn't posted anything yet." />
      ) : (
        <PostGrid>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              token={token}
              canDelete={false}
              onViewUserProfile={onViewUserProfile}
            />
          ))}
        </PostGrid>
      )}
    </div>
  );
};

const SectionHeading = ({ title, count, right }) => (
  <div className="mb-0 mt-10 flex items-end justify-between gap-4 border-b border-line pb-3">
    <div className="flex items-baseline gap-3">
      <h3 className="type-head text-xl md:text-2xl">{title}</h3>
      {count !== undefined && (
        <span className="num text-sm text-sun">{String(count).padStart(2, '0')}</span>
      )}
    </div>
    {right}
  </div>
);

/* ============================================================
   Filters
   ============================================================ */

const FilterPanel = ({
  searchTerm, setSearchTerm, filterCategory, setFilterCategory, filterType, setFilterType,
  priceRange, setPriceRange, showProfile, onPick,
}) => (
  <div className="space-y-8 p-5">
    <div>
      <div className="meta mb-3">01 / Search</div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={15} />
        <input
          type="text"
          placeholder="Find anything…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="field pl-9"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dim hover:text-sun"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>

    <div>
      <div className="meta mb-3">02 / Category</div>
      <div className="border-t border-line">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = filterCategory === cat.value && !showProfile;
          return (
            <button
              key={cat.value}
              onClick={() => { setFilterCategory(cat.value); if (onPick) onPick(); }}
              className={`group relative flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'bg-royal/20 text-chalk'
                  : 'text-ash hover:bg-royal/10 hover:text-chalk'
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 w-[2px] transition-all ${
                  active ? 'bg-sun' : 'bg-transparent group-hover:bg-edge'
                }`}
              />
              <Icon size={15} strokeWidth={1.75} className={active ? 'text-sun' : 'text-dim'} />
              <span className="flex-1 truncate text-[13px] font-medium">{cat.name}</span>
              {active && <span className="num text-[10px] text-sun">●</span>}
            </button>
          );
        })}
      </div>
    </div>

    <div>
      <div className="meta mb-3">03 / Type</div>
      <div className="grid grid-cols-3 gap-px border border-line bg-line">
        {[
          { value: 'all', label: 'All' },
          { value: 'selling', label: 'Sale' },
          { value: 'buying', label: 'Wanted' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterType(opt.value)}
            className={`py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
              filterType === opt.value ? 'bg-sun text-abyss' : 'bg-panel text-ash hover:bg-raised hover:text-chalk'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    <div>
      <div className="meta mb-3">04 / Price</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="MIN"
          value={priceRange.min}
          onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
          className="field num text-center text-xs"
        />
        <span className="h-px w-3 shrink-0 bg-edge" />
        <input
          type="number"
          placeholder="MAX"
          value={priceRange.max}
          onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
          className="field num text-center text-xs"
        />
      </div>
    </div>
  </div>
);

/* ============================================================
   Ticker
   ============================================================ */

const Ticker = ({ posts }) => {
  const items = posts.length
    ? posts.slice(0, 16).map((p) => ({
        tag: p.type === 'selling' ? 'SALE' : 'WANTED',
        text: p.title,
        price: p.sold ? 'SOLD' : priceLabel(p.price),
      }))
    : categories.slice(1).map((c) => ({ tag: 'CATEGORY', text: c.name, price: '—' }));

  const group = (
    <div className="flex shrink-0 items-center">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2 whitespace-nowrap px-5">
          <span className="meta-hi text-sun">{it.tag}</span>
          <span className="meta normal-case tracking-normal text-ash">{it.text}</span>
          <span className="num text-[10px] text-chalk">{it.price}</span>
          <span className="ml-3 h-1 w-1 bg-line" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="hidden h-7 items-center border-b border-line bg-[#002A42] lg:flex">
      <div className="flex h-full shrink-0 items-center gap-2 border-r border-line bg-sun px-3">
        <span className="h-1.5 w-1.5 animate-blip rounded-full bg-ink" />
        <span className="meta-hi text-abyss">Live</span>
      </div>
      <div className="marquee h-full flex-1">
        <div className="marquee-track h-full items-center">
          {group}
          {group}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   Landing
   ============================================================ */

const ROTATING = ['TICKETS', 'SWIPES', 'TEXTBOOKS', 'COUCHES', 'PARKING', 'SNEAKERS', 'RIDES'];

const LandingPage = ({ onLogin, onSignUp, onAuthSuccess, onViewMarketplace, showAuthModal, setShowAuthModal }) => {
  const [word, setWord] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWord((w) => (w + 1) % ROTATING.length), 1900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink">
      {/* Campus plate, duotoned royal */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center opacity-[0.32] grayscale"
          style={{ backgroundImage: `url(/landing_page_background.jpg)` }}
        />
        <div className="absolute inset-0 bg-[#0B6E9B]/80 mix-blend-color" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/45 via-ink/80 to-ink" />
      </div>
      <div className="blueprint absolute inset-0 opacity-70" />
      <div className="grain" />

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <Brand />
          <span className="meta-hi hidden border border-sun/40 px-2 py-1 text-sun sm:inline-block">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onViewMarketplace} className="btn btn-quiet hidden sm:inline-flex">
            Browse
          </button>
          <button onClick={onLogin} className="btn btn-ghost">Log in</button>
          <button onClick={onSignUp} className="btn btn-sun">Sign up</button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto grid w-full max-w-[1500px] flex-1 content-center gap-12 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-24">
        <div>
          <div className="animate-rise meta flex flex-wrap items-center gap-2">
            <span className="h-1.5 w-1.5 animate-blip rounded-full bg-sun" />
            UCLA only · Verified @ucla.edu · Westwood, CA
          </div>

          <h1 className="type-display mt-7 text-[clamp(2.75rem,10vw,6.5rem)]">
            <span className="animate-rise block" style={{ animationDelay: '80ms' }}>Sell your</span>
            <span
              className="animate-rise relative block overflow-hidden py-1"
              style={{ animationDelay: '160ms' }}
            >
              <span key={word} className="animate-rise block text-sun">
                {ROTATING[word]}
              </span>
            </span>
            <span className="animate-rise block" style={{ animationDelay: '240ms' }}>
              to a bruin.
            </span>
          </h1>

          <p
            className="animate-rise mt-7 max-w-md text-[15px] leading-relaxed text-ash"
            style={{ animationDelay: '320ms' }}
          >
            A marketplace that stops at the edge of campus. No shipping, no strangers, no fees —
            just students trading with students, a ten minute walk away.
          </p>

          <div
            className="animate-rise mt-9 flex w-full flex-col gap-px bg-line sm:w-fit sm:flex-row sm:items-stretch"
            style={{ animationDelay: '400ms' }}
          >
            <button onClick={onSignUp} className="btn btn-sun rounded-none px-8 py-4 text-sm">
              Get started <ArrowRight size={16} />
            </button>
            <button
              onClick={onViewMarketplace}
              className="btn rounded-none bg-panel px-8 py-4 text-sm text-chalk transition-colors hover:bg-raised"
            >
              Look around first
            </button>
          </div>
        </div>

        {/* Category plate */}
        <div className="animate-rise self-center" style={{ animationDelay: '560ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="meta">Browse the market</span>
            <span className="meta">/ 12</span>
          </div>
          <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-2">
            {categories.slice(1).map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={onViewMarketplace}
                  className="group relative flex items-center gap-3 bg-panel px-4 py-4 text-left transition-colors hover:bg-sun"
                >
                  <Icon
                    size={17}
                    strokeWidth={1.75}
                    className="text-sun transition-colors group-hover:text-abyss"
                  />
                  <span className="truncate text-[13px] font-medium text-ash transition-colors group-hover:text-abyss">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer strip */}
      <footer className="relative z-10 border-t border-line">
        <div className="flex flex-col items-center justify-between gap-2 px-4 py-4 md:flex-row md:px-8">
          <span className="meta">Mobile app coming soon</span>
          <span className="meta">Built by bruins, for bruins</span>
        </div>
      </footer>

      {showAuthModal.show && (
        <AuthModal
          key={`auth-${showAuthModal.isSignUp}`}
          onClose={() => setShowAuthModal({ show: false, isSignUp: false })}
          onSuccess={onAuthSuccess}
          initialIsSignUp={showAuthModal.isSignUp}
        />
      )}
    </div>
  );
};

/* ============================================================
   Root
   ============================================================ */

const BruinMarket = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showAuthModal, setShowAuthModal] = useState({ show: false, isSignUp: false });
  const [showProfile, setShowProfile] = useState(false);
  const [posts, setPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [initialConversation, setInitialConversation] = useState(null);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(!!localStorage.getItem('token'));
  const [editingPost, setEditingPost] = useState(null);
  const [viewMarketplaceWithoutLogin, setViewMarketplaceWithoutLogin] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setShowProfile(false);
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setCheckingAuth(false);
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (!showProfile) loadPosts();
  }, [filterCategory, filterType, priceRange, searchTerm, showProfile]);

  useEffect(() => {
    if (showMobileSidebar) {
      const t = setTimeout(() => setMobileSidebarVisible(true), 10);
      return () => clearTimeout(t);
    }
    setMobileSidebarVisible(false);
  }, [showMobileSidebar]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setCheckingAuth(false);
    }
  };

  const navigateToAll = () => {
    setFilterCategory('all');
    setFilterType('all');
    setPriceRange({ min: '', max: '' });
    setSearchTerm('');
    setShowProfile(false);
    setViewingUserProfile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterType !== 'all') params.append('type', filterType);
      if (priceRange.min) params.append('min_price', priceRange.min);
      if (priceRange.max) params.append('max_price', priceRange.max);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/posts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData) => {
    if (!token) {
      setShowAuthModal({ show: true, isSignUp: false });
      return;
    }
    try {
      const payload = { ...postData, price: parseFloat(postData.price) };
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }
      const newPost = await response.json();
      setPosts([newPost, ...posts]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
      throw error;
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete post');
        return;
      }
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const markAsSold = async (postId, soldStatus) => {
    try {
      const response = await fetch(`${API_URL}/posts/${postId}/sold`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sold: soldStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Error updating post sold status:', errorMessage, response.status);
        alert(`Failed to update post sold status: ${errorMessage}`);
        return;
      }
      loadPosts();
    } catch (error) {
      console.error('Error updating post sold status:', error);
      alert(`Failed to update post sold status: ${error.message || 'Please try again.'}`);
    }
  };

  const updatePost = async (postId, postData) => {
    try {
      const payload = { ...postData, price: parseFloat(postData.price) };
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update post');
      }
      loadPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
      throw error;
    }
  };

  const openChatWithUser = async (userId) => {
    if (!token) {
      setShowAuthModal({ show: true, isSignUp: false });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/conversations/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        return;
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create conversation (${response.status})`);
      }
      const conversation = await response.json();
      setInitialConversation(conversation);
      setShowChat(true);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(`Failed to create conversation: ${error.message || 'Please try again.'}`);
    }
  };

  const viewUserProfile = async (userId) => {
    if (!token) {
      setShowAuthModal({ show: true, isSignUp: false });
      return;
    }
    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        return;
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch user profile (${response.status})`);
      }
      const data = await response.json();
      setViewingUserProfile(data);
      setShowProfile(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      alert(`Failed to load user profile: ${error.message || 'Please try again.'}`);
    }
  };

  /* ---------- Boot screen ---------- */
  if (checkingAuth && token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="grain" />
        <div className="text-center">
          <img src={logo} alt="" className="mx-auto h-14 w-14 brightness-0 invert" />
          <div className="relative mx-auto mt-6 h-px w-40 overflow-hidden bg-line">
            <span className="absolute inset-y-0 left-0 w-1/3 animate-[marquee_1.2s_linear_infinite] bg-sun" />
          </div>
          <p className="meta mt-4">Verifying session</p>
        </div>
      </div>
    );
  }

  /* ---------- Landing ---------- */
  if ((!token || !user) && !viewMarketplaceWithoutLogin) {
    return (
      <LandingPage
        onLogin={() => setShowAuthModal({ show: true, isSignUp: false })}
        onSignUp={() => setShowAuthModal({ show: true, isSignUp: true })}
        onAuthSuccess={(t, u) => {
          setToken(t);
          setUser(u);
          localStorage.setItem('token', t);
          setShowAuthModal({ show: false, isSignUp: false });
        }}
        onViewMarketplace={() => setViewMarketplaceWithoutLogin(true)}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
      />
    );
  }

  /* ---------- Market ---------- */
  const activeCategory = categories.find((c) => c.value === filterCategory) || categories[0];
  const filtersOn =
    filterCategory !== 'all' || filterType !== 'all' || !!searchTerm || !!priceRange.min || !!priceRange.max;

  const filterProps = {
    searchTerm, setSearchTerm, filterCategory,
    setFilterCategory: (v) => { setFilterCategory(v); setShowProfile(false); setViewingUserProfile(null); },
    filterType, setFilterType, priceRange, setPriceRange, showProfile,
  };

  return (
    <div className="min-h-screen bg-ink">
      <div className="grain" />

      {/* Header + ticker form one sticky block; the rail hangs off its height */}
      <div className="sticky top-0 z-50">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-ink/95 px-3 backdrop-blur md:h-16 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setShowMobileSidebar(true)}
              aria-label="Filters"
              className="flex h-9 w-9 items-center justify-center border border-line text-ash transition-colors hover:border-edge hover:text-chalk lg:hidden"
            >
              <Menu size={17} />
            </button>
            <Brand onClick={navigateToAll} />
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {user ? (
              <>
                <button
                  onClick={() => { setShowChat(true); }}
                  aria-label="Messages"
                  className="flex h-9 items-center gap-2 border border-line px-2.5 text-ash transition-colors hover:border-edge hover:text-chalk md:px-3"
                >
                  <MessageCircle size={16} />
                  <span className="meta-hi hidden lg:inline">Inbox</span>
                </button>

                <button
                  onClick={() => { setShowProfile((v) => !v); setViewingUserProfile(null); }}
                  className={`flex h-9 items-center gap-2 border px-2 transition-colors md:px-2.5 ${
                    showProfile ? 'border-sun bg-sun/10 text-sun' : 'border-line text-ash hover:border-edge hover:text-chalk'
                  }`}
                >
                  <Avatar url={user.profile_picture_url} name={user.name} size={20} />
                  <span className="meta-hi hidden max-w-[110px] truncate lg:inline">{user.name}</span>
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-sun hidden h-9 md:inline-flex"
                >
                  <Plus size={16} /> <span className="hidden lg:inline">Post</span>
                </button>

                <button
                  onClick={logout}
                  aria-label="Log out"
                  className="hidden h-9 w-9 items-center justify-center border border-line text-dim transition-colors hover:border-ember hover:bg-ember hover:text-abyss md:flex"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <span className="meta hidden xl:inline">Viewing as guest</span>
                <button
                  onClick={() => setShowAuthModal({ show: true, isSignUp: false })}
                  className="btn btn-ghost h-9"
                >
                  Log in
                </button>
                <button
                  onClick={() => setShowAuthModal({ show: true, isSignUp: true })}
                  className="btn btn-sun h-9"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </header>

        <Ticker posts={posts} />
      </div>

      <div className="mx-auto flex w-full max-w-[1800px]">
        {/* Rail */}
        <aside className="sticky top-[92px] hidden h-[calc(100vh-92px)] w-[260px] shrink-0 overflow-y-auto border-r border-line bg-panel lg:block">
          <FilterPanel {...filterProps} />
          <div className="border-t border-line p-5">
            <div className="meta mb-3">Signed in as</div>
            {user ? (
              <div className="flex items-center gap-2.5">
                <Avatar url={user.profile_picture_url} name={user.name} size={28} ring />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-chalk">{user.name}</div>
                  <div className="meta mt-1 truncate">{user.year || 'Bruin'}</div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal({ show: true, isSignUp: true })}
                className="btn btn-ghost w-full"
              >
                Create account
              </button>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {viewingUserProfile ? (
            <OtherUserProfile
              profileData={viewingUserProfile}
              token={token}
              onClose={() => setViewingUserProfile(null)}
              onViewUserProfile={viewUserProfile}
            />
          ) : showProfile ? (
            <ProfilePage
              user={user}
              token={token}
              onDeletePost={deletePost}
              onEdit={setEditingPost}
              onMarkAsSold={markAsSold}
            />
          ) : (
            <>
              {/* Results header */}
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
                <div>
                  <div className="meta mb-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-blip rounded-full bg-sun" />
                    {filterType === 'all' ? 'All listings' : filterType === 'selling' ? 'For sale' : 'Wanted'}
                  </div>
                  <h1 className="type-display text-[clamp(1.9rem,5vw,3rem)]">
                    {activeCategory.value === 'all' ? 'The Market' : activeCategory.name}
                  </h1>
                </div>

                <div className="flex items-end gap-4">
                  <div className="text-right">
                    <div className="num text-3xl font-bold leading-none text-sun">
                      {loading ? '··' : String(posts.length).padStart(2, '0')}
                    </div>
                    <div className="meta mt-1.5">Results</div>
                  </div>
                  {filtersOn && (
                    <button onClick={navigateToAll} className="btn btn-ghost h-9">
                      <X size={14} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {searchTerm && (
                <div className="meta mb-4 flex items-center gap-2">
                  Matching
                  <span className="meta-hi bg-raised px-2 py-1 normal-case tracking-normal">
                    {searchTerm}
                  </span>
                </div>
              )}

              {loading ? (
                <PostGrid>
                  {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
                </PostGrid>
              ) : posts.length === 0 ? (
                <EmptyState
                  title="Nothing here yet"
                  body={
                    filtersOn
                      ? 'No listings match these filters. Try widening the search.'
                      : 'The market is empty. Be the one who starts it.'
                  }
                  action={
                    filtersOn ? (
                      <button onClick={navigateToAll} className="btn btn-ghost">Reset filters</button>
                    ) : user ? (
                      <button onClick={() => setShowCreateModal(true)} className="btn btn-sun">
                        <Plus size={16} /> Create the first listing
                      </button>
                    ) : null
                  }
                />
              ) : (
                <PostGrid>
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onDelete={deletePost}
                      onEdit={() => setEditingPost(post)}
                      onMarkAsSold={markAsSold}
                      canDelete={user && post.user_id === user.id}
                      token={token}
                      onMessageUser={user ? openChatWithUser : undefined}
                      onViewUserProfile={viewUserProfile}
                    />
                  ))}
                </PostGrid>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile filter drawer */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <div
            className={`absolute inset-0 bg-abyss/80 backdrop-blur-[2px] transition-opacity duration-300 ${
              mobileSidebarVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setShowMobileSidebar(false)}
          />
          <div
            className={`absolute inset-y-0 left-0 flex w-[86vw] max-w-sm flex-col border-r border-line bg-panel transition-transform duration-300 ease-out ${
              mobileSidebarVisible ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="meta-hi">Filters</span>
              <button
                onClick={() => setShowMobileSidebar(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center border border-line text-ash hover:border-ember hover:bg-ember hover:text-abyss"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <FilterPanel {...filterProps} onPick={() => setShowMobileSidebar(false)} />
            </div>

            {user && (
              <div className="grid grid-cols-3 gap-px border-t border-line bg-line">
                <button
                  onClick={() => { setShowProfile(true); setViewingUserProfile(null); setShowMobileSidebar(false); }}
                  className="meta-hi flex flex-col items-center gap-1.5 bg-panel py-3.5 text-ash"
                >
                  <User size={16} /> Profile
                </button>
                <button
                  onClick={() => { setShowChat(true); setShowMobileSidebar(false); }}
                  className="meta-hi flex flex-col items-center gap-1.5 bg-panel py-3.5 text-ash"
                >
                  <MessageCircle size={16} /> Inbox
                </button>
                <button
                  onClick={() => { setShowMobileSidebar(false); logout(); }}
                  className="meta-hi flex flex-col items-center gap-1.5 bg-panel py-3.5 text-ember"
                >
                  <LogOut size={16} /> Exit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile compose */}
      {user && !showMobileSidebar && !showChat && !showCreateModal && !editingPost && (
        <button
          onClick={() => setShowCreateModal(true)}
          aria-label="Create listing"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center bg-sun text-abyss transition-transform active:scale-95 md:hidden"
        >
          <Plus size={24} />
        </button>
      )}

      {showAuthModal.show && (
        <AuthModal
          key={`auth-${showAuthModal.isSignUp}`}
          onClose={() => setShowAuthModal({ show: false, isSignUp: false })}
          onSuccess={(t, u) => {
            setToken(t);
            setUser(u);
            localStorage.setItem('token', t);
            setShowAuthModal({ show: false, isSignUp: false });
          }}
          initialIsSignUp={showAuthModal.isSignUp}
        />
      )}

      {showCreateModal && (
        <PostComposer
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={createPost}
          categories={categories.filter((c) => c.value !== 'all')}
          token={token}
        />
      )}

      {editingPost && (
        <PostComposer
          mode="edit"
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSubmit={async (postData) => {
            await updatePost(editingPost.id, postData);
            setEditingPost(null);
          }}
          categories={categories.filter((c) => c.value !== 'all')}
          token={token}
        />
      )}

      {showChat && (
        <Chat
          user={user}
          token={token}
          initialConversation={initialConversation}
          onClose={() => {
            setShowChat(false);
            setInitialConversation(null);
          }}
        />
      )}
    </div>
  );
};

export default BruinMarket;
