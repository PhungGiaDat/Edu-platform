import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  BookOpenIcon,
  CardsIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  SaveIcon,
  TrashIcon,
} from '../../components/Icons';
import { adminCoursesApi } from '../../services/adminApi';
import type { CourseCreate, CourseUpdate, Lesson } from '../../types/admin';

interface CourseEditorProps {
  isEdit?: boolean;
}

type BlockType = 'text' | 'video' | 'image';

type CourseView = 'details' | 'sessions' | 'review';

const COURSE_VIEWS: { id: CourseView; label: string; help: string }[] = [
  { id: 'details', label: 'Details', help: 'Course information students see first' },
  { id: 'sessions', label: 'Sessions', help: 'Build and arrange learning sessions' },
  { id: 'review', label: 'Review', help: 'Preview and publish readiness' },
];

interface SessionBlock {
  id: string;
  type: BlockType;
  label: string;
  value: string;
}

interface CourseSession {
  id: string;
  lessonId: string;
  title: string;
  titleVi: string;
  description: string;
  durationMinutes: number;
  blocks: SessionBlock[];
}

interface CourseFormState {
  title: string;
  subtitleVi: string;
  description: string;
  descriptionVi: string;
  thumbnailUrl: string;
  theme: string;
  categoryKey: string;
  categoryLabel: string;
  ageRange: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isTemplate: boolean;
}

const inputClassName =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1987e5] focus:ring-2 focus:ring-[#1987e5]/20';

const initialForm: CourseFormState = {
  title: '',
  subtitleVi: '',
  description: '',
  descriptionVi: '',
  thumbnailUrl: '',
  theme: '',
  categoryKey: '',
  categoryLabel: '',
  ageRange: '5-8',
  level: 'beginner',
  isTemplate: false,
};

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createBlock = (type: BlockType): SessionBlock => ({
  id: createId('block'),
  type,
  label: type === 'text' ? 'Learning content' : type === 'video' ? 'Video lesson' : 'Learning image',
  value: '',
});

const createSession = (position: number): CourseSession => ({
  id: createId('session'),
  lessonId: createId('lesson'),
  title: `Session ${position}`,
  titleVi: '',
  description: '',
  durationMinutes: 5,
  blocks: [createBlock('text')],
});

const lessonToSession = (lesson: Lesson, index: number): CourseSession => {
  const blocks: SessionBlock[] = [];
  if (lesson.content) {
    blocks.push({ id: createId('block'), type: 'text', label: 'Learning content', value: lesson.content });
  }
  if (lesson.video_url) {
    blocks.push({ id: createId('block'), type: 'video', label: 'Video lesson', value: lesson.video_url });
  }
  (lesson.images ?? []).forEach((imageUrl, imageIndex) => {
    blocks.push({
      id: createId('block'),
      type: 'image',
      label: `Learning image ${imageIndex + 1}`,
      value: imageUrl,
    });
  });

  return {
    id: createId('session'),
    lessonId: lesson.lesson_id || createId('lesson'),
    title: lesson.title || `Session ${index + 1}`,
    titleVi: lesson.title_vi ?? '',
    description: lesson.description ?? '',
    durationMinutes: Math.min(7, Math.max(3, lesson.duration_minutes ?? 5)),
    blocks: blocks.length > 0 ? blocks : [createBlock('text')],
  };
};

const sessionToLesson = (session: CourseSession, index: number): Lesson => {
  const textBlocks = session.blocks.filter((block) => block.type === 'text' && block.value.trim());
  const videoBlock = session.blocks.find((block) => block.type === 'video' && block.value.trim());
  const images = session.blocks
    .filter((block) => block.type === 'image' && block.value.trim())
    .map((block) => block.value.trim());

  return {
    lesson_id: session.lessonId,
    title: session.title.trim(),
    title_vi: session.titleVi.trim(),
    description: session.description.trim() || undefined,
    order: index + 1,
    duration_minutes: session.durationMinutes,
    content:
      textBlocks
        .map((block) => {
          const label = block.label.trim();
          return label && label !== 'Learning content'
            ? `### ${label}\n${block.value.trim()}`
            : block.value.trim();
        })
        .join('\n\n') || undefined,
    video_url: videoBlock?.value.trim() || undefined,
    images,
    is_completed: false,
  };
};

const blockHelp: Record<BlockType, string> = {
  text: 'Add instructions, a story, or lesson notes.',
  video: 'Paste one direct or hosted video URL.',
  image: 'Paste an image URL for visual learning.',
};

const CourseEditor: React.FC<CourseEditorProps> = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();
  const [form, setForm] = useState<CourseFormState>(initialForm);
  const [sessions, setSessions] = useState<CourseSession[]>([createSession(1)]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [view, setView] = useState<CourseView>('details');
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !courseId) return;

    let isActive = true;
    const loadCourse = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const course = await adminCoursesApi.getCourse(courseId);
        if (!isActive) return;
        setForm({
          title: course.title ?? '',
          subtitleVi: course.subtitle_vi ?? '',
          description: course.description ?? '',
          descriptionVi: course.description_vi ?? '',
          thumbnailUrl: course.thumbnail_url ?? '',
          theme: course.theme ?? '',
          categoryKey: course.category_key ?? '',
          categoryLabel: course.category_label ?? '',
          ageRange: course.age_range ?? '5-8',
          level: course.level ?? 'beginner',
          isTemplate: course.is_template ?? false,
        });
        setIsPublished(course.is_published ?? false);
        const loadedSessions = (course.lessons ?? []).map(lessonToSession);
        setSessions(loadedSessions.length > 0 ? loadedSessions : [createSession(1)]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load course');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadCourse();
    return () => {
      isActive = false;
    };
  }, [courseId, isEdit]);

  const totalDuration = useMemo(
    () => sessions.reduce((total, session) => total + session.durationMinutes, 0),
    [sessions],
  );

  const completedSessions = useMemo(
    () =>
      sessions.filter(
        (session) => session.title.trim() && session.blocks.some((block) => block.value.trim()),
      ).length,
    [sessions],
  );

  const checklist = [
    { label: 'Course title added', complete: Boolean(form.title.trim()) },
    { label: 'Course description added', complete: Boolean(form.description.trim()) },
    { label: 'Cover image added', complete: Boolean(form.thumbnailUrl.trim()) },
    { label: 'At least one session ready', complete: completedSessions > 0 },
    {
      label: 'All sessions have content',
      complete: sessions.length > 0 && completedSessions === sessions.length,
    },
  ];

  const completionPercent = Math.round(
    (checklist.filter((item) => item.complete).length / checklist.length) * 100,
  );

  const updateForm = <K extends keyof CourseFormState>(key: K, value: CourseFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateSession = (sessionId: string, patch: Partial<CourseSession>) => {
    setSessions((current) =>
      current.map((session) => (session.id === sessionId ? { ...session, ...patch } : session)),
    );
  };

  const updateBlock = (sessionId: string, blockId: string, patch: Partial<SessionBlock>) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              blocks: session.blocks.map((block) =>
                block.id === blockId ? { ...block, ...patch } : block,
              ),
            }
          : session,
      ),
    );
  };

  const addSession = () => {
    const newSession = createSession(sessions.length + 1);
    setSessions((current) => [...current, newSession]);
    setActiveSessionId(newSession.id);
  };

  const duplicateSession = (sessionId: string) => {
    const sourceIndex = sessions.findIndex((session) => session.id === sessionId);
    if (sourceIndex < 0) return;
    const source = sessions[sourceIndex];
    const duplicate: CourseSession = {
      ...source,
      id: createId('session'),
      lessonId: createId('lesson'),
      title: `${source.title} copy`,
      blocks: source.blocks.map((block) => ({ ...block, id: createId('block') })),
    };
    setSessions((current) => {
      const currentSourceIndex = current.findIndex((session) => session.id === sessionId);
      if (currentSourceIndex < 0) return current;
      const next = [...current];
      next.splice(currentSourceIndex + 1, 0, duplicate);
      return next;
    });
    setActiveSessionId(duplicate.id);
  };

  const removeSession = (sessionId: string) => {
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    if (activeSessionId === sessionId) setActiveSessionId(null);
  };

  const moveSession = (sessionId: string, direction: -1 | 1) => {
    setSessions((current) => {
      const index = current.findIndex((session) => session.id === sessionId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addBlock = (sessionId: string, type: BlockType) => {
    const block = createBlock(type);
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, blocks: [...session.blocks, block] } : session,
      ),
    );
  };

  const removeBlock = (sessionId: string, blockId: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, blocks: session.blocks.filter((block) => block.id !== blockId) }
          : session,
      ),
    );
  };

  const validate = (publish: boolean) => {
    if (!form.title.trim()) return 'Add a course title before saving.';
    if (sessions.length === 0) return 'Add at least one learning session.';
    const unnamedIndex = sessions.findIndex((session) => !session.title.trim());
    if (unnamedIndex >= 0) return `Session ${unnamedIndex + 1} needs a title.`;
    if (publish) {
      const emptyIndex = sessions.findIndex(
        (session) => !session.blocks.some((block) => block.value.trim()),
      );
      if (emptyIndex >= 0) return `Session ${emptyIndex + 1} needs at least one completed content block.`;
      if (!form.description.trim()) return 'Add a course description before publishing.';
    }
    return null;
  };

  const saveCourse = async (publish: boolean) => {
    const validationError = validate(publish);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const lessons = sessions.map(sessionToLesson);
    const nextPublishedState = publish || (isEdit && isPublished);
    const sharedPayload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      thumbnail_url: form.thumbnailUrl.trim() || undefined,
      subtitle_vi: form.subtitleVi.trim(),
      theme: form.theme.trim(),
      category_key: form.categoryKey.trim(),
      category_label: form.categoryLabel.trim(),
      category_icon: '',
      age_range: form.ageRange,
      level: form.level,
      description_vi: form.descriptionVi.trim(),
      is_template: form.isTemplate,
      is_published: nextPublishedState,
      lessons,
    };

    try {
      if (isEdit && courseId) {
        await adminCoursesApi.updateCourse(courseId, sharedPayload satisfies CourseUpdate);
      } else {
        await adminCoursesApi.createCourse(sharedPayload satisfies CourseCreate);
      }
      navigate('/admin/courses');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-7xl animate-pulse space-y-6 px-1">
          <div className="h-10 w-64 rounded-xl bg-slate-200" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="h-[620px] rounded-2xl bg-slate-200" />
            <div className="h-80 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-1 pb-10">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate('/admin/courses')}
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-950 active:translate-y-px"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Courses
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {isEdit ? 'Edit course' : 'Build a new course'}
              </h1>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  isPublished
                    ? 'border-blue-200 bg-blue-50 text-[#0b5e9e]'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Shape the course, arrange sessions, then publish when every learning block is ready.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveCourse(false)}
              disabled={isSubmitting}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SaveIcon className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={() => void saveCourse(true)}
              disabled={isSubmitting}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#126db5] px-4 text-sm font-semibold text-white transition hover:bg-[#0f5f9f] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publish course
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            {error}
          </div>
        )}

        <nav
          aria-label="Course editor sections"
          className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(30,64,175,0.06)]"
        >
          {COURSE_VIEWS.map((courseView) => {
            const isActive = view === courseView.id;
            return (
              <button
                key={courseView.id}
                type="button"
                onClick={() => setView(courseView.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-11 flex-1 flex-col items-start justify-center rounded-xl px-4 py-2 text-left transition ${
                  isActive
                    ? 'bg-[#126db5] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-50 active:translate-y-px'
                }`}
              >
                <span className="text-sm font-bold">{courseView.label}</span>
                <span className={`text-xs ${isActive ? 'text-blue-50' : 'text-slate-500'}`}>
                  {courseView.help}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="min-w-0 space-y-6">
            {view === 'details' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(30,64,175,0.06)] sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-[#126db5]">
                  <BookOpenIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Course setup</h2>
                  <p className="text-sm text-slate-600">The details students see before they begin.</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="course-title" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Course title <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="course-title"
                    value={form.title}
                    onChange={(event) => updateForm('title', event.target.value)}
                    className={inputClassName}
                    placeholder="Example: English at Home"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="course-description" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Course description
                  </label>
                  <textarea
                    id="course-description"
                    value={form.description}
                    onChange={(event) => updateForm('description', event.target.value)}
                    rows={3}
                    className={inputClassName}
                    placeholder="Explain what students will learn and what they can do after the course."
                  />
                </div>

                <div>
                  <label htmlFor="course-category" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Category
                  </label>
                  <input
                    id="course-category"
                    value={form.categoryLabel}
                    onChange={(event) => {
                      updateForm('categoryLabel', event.target.value);
                      updateForm(
                        'categoryKey',
                        event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
                      );
                    }}
                    className={inputClassName}
                    placeholder="Language learning"
                  />
                </div>

                <div>
                  <label htmlFor="course-theme" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Theme
                  </label>
                  <input
                    id="course-theme"
                    value={form.theme}
                    onChange={(event) => updateForm('theme', event.target.value)}
                    className={inputClassName}
                    placeholder="Home and family"
                  />
                </div>

                <div>
                  <label htmlFor="course-age" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Age range
                  </label>
                  <select
                    id="course-age"
                    value={form.ageRange}
                    onChange={(event) => updateForm('ageRange', event.target.value)}
                    className={inputClassName}
                  >
                    <option value="5-8">5-8 years</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="course-level" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Level
                  </label>
                  <select
                    id="course-level"
                    value={form.level}
                    onChange={(event) =>
                      updateForm('level', event.target.value as CourseFormState['level'])
                    }
                    className={inputClassName}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="course-thumbnail" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Cover image URL
                  </label>
                  <input
                    id="course-thumbnail"
                    type="url"
                    value={form.thumbnailUrl}
                    onChange={(event) => updateForm('thumbnailUrl', event.target.value)}
                    className={inputClassName}
                    placeholder="https://example.com/course-cover.jpg"
                  />
                </div>
              </div>

              <details className="mt-6 border-t border-slate-200 pt-5">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#1987e5]">
                  Vietnamese content and template settings
                </summary>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="course-subtitle-vi" className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Vietnamese subtitle
                    </label>
                    <input
                      id="course-subtitle-vi"
                      value={form.subtitleVi}
                      onChange={(event) => updateForm('subtitleVi', event.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="course-description-vi" className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Vietnamese description
                    </label>
                    <textarea
                      id="course-description-vi"
                      value={form.descriptionVi}
                      onChange={(event) => updateForm('descriptionVi', event.target.value)}
                      rows={3}
                      className={inputClassName}
                    />
                  </div>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.isTemplate}
                      onChange={(event) => updateForm('isTemplate', event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#126db5]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">Make this reusable</span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        Other course drafts can use this structure as a template.
                      </span>
                    </span>
                  </label>
                </div>
              </details>
            </section>
            )}

            {view === 'sessions' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(30,64,175,0.06)] sm:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-[#126db5]">
                    <CardsIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Learning sessions</h2>
                    <p className="text-sm text-slate-600">
                      Build short sessions from text, video, and image blocks.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSession}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#126db5] px-4 text-sm font-semibold text-white transition hover:bg-[#0f5f9f] active:translate-y-px"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add session
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <BookOpenIcon className="mx-auto h-9 w-9 text-slate-400" />
                  <h3 className="mt-3 font-bold text-slate-900">Your course needs a session</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
                    Add the first session, then combine content blocks without writing code.
                  </p>
                  <button
                    type="button"
                    onClick={addSession}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#126db5] px-4 text-sm font-semibold text-white"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add first session
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session, index) => {
                    const isExpanded = activeSessionId === session.id || sessions.length === 1;
                    const contentCount = session.blocks.filter((block) => block.value.trim()).length;
                    return (
                      <article key={session.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="flex items-center gap-3 bg-slate-50 px-3 py-3 sm:px-4">
                          <button
                            type="button"
                            onClick={() => setActiveSessionId(isExpanded ? null : session.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#1987e5]"
                            aria-expanded={isExpanded}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#126db5] shadow-sm ring-1 ring-slate-200">
                              {index + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-slate-900">
                                {session.title || 'Untitled session'}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                                <span>{session.durationMinutes} min</span>
                                <span>{contentCount} completed blocks</span>
                              </span>
                            </span>
                          </button>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveSession(session.id, -1)}
                              disabled={index === 0}
                              aria-label={`Move session ${index + 1} up`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-30"
                            >
                              <ChevronLeftIcon className="h-4 w-4 rotate-90" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSession(session.id, 1)}
                              disabled={index === sessions.length - 1}
                              aria-label={`Move session ${index + 1} down`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-30"
                            >
                              <ChevronRightIcon className="h-4 w-4 rotate-90" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateSession(session.id)}
                              aria-label={`Duplicate session ${index + 1}`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                            >
                              <CardsIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSession(session.id)}
                              aria-label={`Delete session ${index + 1}`}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSessionId(isExpanded ? null : session.id)}
                              aria-label={isExpanded ? 'Collapse session' : 'Expand session'}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
                            >
                              <ChevronRightIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="space-y-6 border-t border-slate-200 p-4 sm:p-5">
                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                              <div>
                                <label htmlFor={`session-${session.id}-title`} className="mb-1.5 block text-sm font-semibold text-slate-800">
                                  Session title <span className="text-red-600">*</span>
                                </label>
                                <input
                                  id={`session-${session.id}-title`}
                                  value={session.title}
                                  onChange={(event) => updateSession(session.id, { title: event.target.value })}
                                  className={inputClassName}
                                />
                              </div>
                              <div>
                                <label htmlFor={`session-${session.id}-duration`} className="mb-1.5 block text-sm font-semibold text-slate-800">
                                  Duration
                                </label>
                                <select
                                  id={`session-${session.id}-duration`}
                                  value={session.durationMinutes}
                                  onChange={(event) =>
                                    updateSession(session.id, { durationMinutes: Number(event.target.value) })
                                  }
                                  className={inputClassName}
                                >
                                  {[3, 4, 5, 6, 7].map((minutes) => (
                                    <option key={minutes} value={minutes}>{minutes} min</option>
                                  ))}
                                </select>
                              </div>
                              <div className="sm:col-span-2">
                                <label htmlFor={`session-${session.id}-description`} className="mb-1.5 block text-sm font-semibold text-slate-800">
                                  Session goal
                                </label>
                                <textarea
                                  id={`session-${session.id}-description`}
                                  value={session.description}
                                  onChange={(event) => updateSession(session.id, { description: event.target.value })}
                                  rows={2}
                                  className={inputClassName}
                                  placeholder="What should the student understand or practice?"
                                />
                              </div>
                            </div>

                            <div>
                              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                                <div>
                                  <h3 className="text-sm font-bold text-slate-950">Content blocks</h3>
                                  <p className="mt-0.5 text-xs text-slate-600">Add only what this session needs.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(['text', 'video', 'image'] as BlockType[]).map((type) => (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => addBlock(session.id, type)}
                                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold capitalize text-slate-700 transition hover:border-[#1987e5] hover:text-[#126db5] active:translate-y-px"
                                    >
                                      <PlusIcon className="h-3.5 w-3.5" />
                                      {type}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {session.blocks.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center text-sm text-slate-600">
                                  Choose a text, video, or image block to add session content.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {session.blocks.map((block, blockIndex) => (
                                    <div key={block.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                      <div className="mb-3 flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold capitalize text-slate-900">
                                            {block.type} block {blockIndex + 1}
                                          </p>
                                          <p className="mt-0.5 text-xs text-slate-500">{blockHelp[block.type]}</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeBlock(session.id, block.id)}
                                          aria-label={`Remove ${block.type} block`}
                                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                      {block.type === 'text' && (
                                        <div className="space-y-3">
                                          <input
                                            aria-label="Block heading"
                                            value={block.label}
                                            onChange={(event) => updateBlock(session.id, block.id, { label: event.target.value })}
                                            className={inputClassName}
                                            placeholder="Block heading"
                                          />
                                          <textarea
                                            aria-label="Text block content"
                                            value={block.value}
                                            onChange={(event) => updateBlock(session.id, block.id, { value: event.target.value })}
                                            rows={5}
                                            className={inputClassName}
                                            placeholder="Write the learning content here. Markdown headings and lists are supported."
                                          />
                                        </div>
                                      )}
                                      {block.type === 'video' && (
                                        <input
                                          type="url"
                                          aria-label="Video URL"
                                          value={block.value}
                                          onChange={(event) => updateBlock(session.id, block.id, { value: event.target.value })}
                                          className={inputClassName}
                                          placeholder="https://example.com/lesson-video.mp4"
                                        />
                                      )}
                                      {block.type === 'image' && (
                                        <input
                                          type="url"
                                          aria-label="Image URL"
                                          value={block.value}
                                          onChange={(event) => updateBlock(session.id, block.id, { value: event.target.value })}
                                          className={inputClassName}
                                          placeholder="https://example.com/learning-image.jpg"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <details className="border-t border-slate-200 pt-4">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[#1987e5]">
                                Vietnamese session title
                              </summary>
                              <div className="mt-3">
                                <label htmlFor={`session-${session.id}-title-vi`} className="sr-only">
                                  Vietnamese session title
                                </label>
                                <input
                                  id={`session-${session.id}-title-vi`}
                                  value={session.titleVi}
                                  onChange={(event) => updateSession(session.id, { titleVi: event.target.value })}
                                  className={inputClassName}
                                  placeholder="Vietnamese title"
                                />
                              </div>
                            </details>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
            )}

            {view === 'review' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(30,64,175,0.06)] sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-[#126db5]">
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Review and publish</h2>
                  <p className="text-sm text-slate-600">
                    Confirm every item is ready, then publish from the top of the page.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">Publish readiness</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{completionPercent}% complete</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold text-[#126db5] shadow-sm">
                    {completionPercent}%
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {checklist.map((item) => (
                    <div key={item.label} className="flex items-start gap-2.5">
                      <CheckCircleIcon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${item.complete ? 'text-[#126db5]' : 'text-slate-300'}`}
                      />
                      <span className={`text-sm ${item.complete ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <span className="block text-xs text-slate-500">Sessions</span>
                  <span className="mt-1 block text-xl font-bold text-slate-950">{sessions.length}</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <span className="block text-xs text-slate-500">Ready sessions</span>
                  <span className="mt-1 block text-xl font-bold text-slate-950">{completedSessions}</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <span className="block text-xs text-slate-500">Total duration</span>
                  <span className="mt-1 block text-xl font-bold text-slate-950">{totalDuration} min</span>
                </div>
              </div>
            </section>
            )}
          </main>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(30,64,175,0.06)]">
              <div className="aspect-[16/10] bg-slate-100">
                {form.thumbnailUrl ? (
                  <img
                    src={form.thumbnailUrl}
                    alt="Course cover preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-400">
                    <BookOpenIcon className="h-10 w-10" />
                    <span className="mt-2 text-xs font-semibold">Cover preview</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="line-clamp-2 font-bold text-slate-950">{form.title || 'Untitled course'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                  {form.description || 'Your course description will appear here.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-slate-500">Sessions</span>
                    <span className="mt-1 block text-base font-bold text-slate-900">{sessions.length}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-slate-500">Duration</span>
                    <span className="mt-1 block text-base font-bold text-slate-900">{totalDuration} min</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(30,64,175,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">Ready to publish</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{completionPercent}% complete</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[#126db5]">
                  {completionPercent}%
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <CheckCircleIcon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${item.complete ? 'text-[#126db5]' : 'text-slate-300'}`}
                    />
                    <span className={`text-xs ${item.complete ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-[#0b4f82]">
              <div className="flex gap-2.5">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-5">
                  Sessions are kept between 3 and 7 minutes to match the student learning flow.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
};

export const CourseCreatePage = () => <CourseEditor isEdit={false} />;
export const CourseEditPage = () => <CourseEditor isEdit={true} />;

export default CourseEditor;
