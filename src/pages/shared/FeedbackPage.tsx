import { useState, useRef } from 'react';
import { Star, ImagePlus, X, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

// Feedback for every user — star rating + note + optional screenshot, sent to the super-admin.
export default function FeedbackPage() {
  const { showToast } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<string>(''); // data URL
  const [category, setCategory] = useState<'Bug' | 'Suggestion' | 'Praise' | 'Other'>('Suggestion');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please attach an image', 'error'); return; }
    if (file.size > 4 * 1024 * 1024) { showToast('Image too large (max 4 MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!message.trim() && rating === 0) {
      showToast('Add a rating or a note first', 'error');
      return;
    }
    setSending(true);
    try {
      await api.post('/feedback', { rating, message: message.trim(), category, screenshot });
      setSent(true);
      showToast('Thank you! Your feedback was sent.', 'success');
    } catch (e) {
      showToast(`Could not send feedback: ${e instanceof Error ? e.message : 'try again'}`, 'error');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Feedback sent</h2>
        <p className="text-slate-500 mt-1">Thank you for helping us improve Vyasa. Our team will look into it.</p>
        <button
          onClick={() => { setSent(false); setRating(0); setMessage(''); setScreenshot(''); setCategory('Suggestion'); }}
          className="btn-secondary btn-sm mt-6">
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-5 h-5 text-teal-500" />
        <h1 className="page-title">Feedback</h1>
      </div>
      <p className="page-subtitle">Tell us what's working, what's broken, or what you'd like to see. It goes straight to our team.</p>

      <div className="card p-6 space-y-5 mt-4">
        {/* Star rating */}
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">How is your experience?</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-0.5 transition-transform hover:scale-110"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                <Star
                  className={cn('w-8 h-8 transition-colors',
                    (hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
                />
              </button>
            ))}
            {rating > 0 && <span className="ml-2 text-sm text-slate-500">{rating}/5</span>}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Type</label>
          <div className="flex flex-wrap gap-2">
            {(['Bug', 'Suggestion', 'Praise', 'Other'] as const).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn('px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                  category === c ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Your message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe the issue or idea. Be as specific as you like — page, what happened, what you expected…"
            className="input resize-none w-full"
          />
        </div>

        {/* Attach screenshot */}
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Attach a screenshot (optional)</label>
          {screenshot ? (
            <div className="relative inline-block">
              <img src={screenshot} alt="attachment" className="max-h-48 rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => { setScreenshot(''); if (fileRef.current) fileRef.current.value = ''; }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50">
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-colors w-full justify-center">
              <ImagePlus className="w-5 h-5" /> Click to attach an image
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
        </div>

        <button
          onClick={submit}
          disabled={sending}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60">
          <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Submit feedback'}
        </button>
      </div>
    </div>
  );
}
