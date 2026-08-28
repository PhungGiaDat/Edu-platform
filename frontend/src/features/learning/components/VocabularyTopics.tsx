/**
 * VocabularyTopics - Topic filter chips
 */
import { Badge } from '@/shared/components/ui/Badge';
import type { VocabularyTopic } from '@/types/notebook';
import { colors } from '@/design-tokens/claymorphic';

interface VocabularyTopicsProps {
  topics: VocabularyTopic[];
  selectedTopic: string | null;
  onSelectTopic: (slug: string | null) => void;
  showIELTS?: boolean;
}

export function VocabularyTopics({
  topics,
  selectedTopic,
  onSelectTopic,
  showIELTS = true,
}: VocabularyTopicsProps) {
  const filteredTopics = showIELTS
    ? topics
    : topics.filter((t) => !t.is_ielts);

  const conversationTopics = filteredTopics.filter((t) => !t.is_ielts);
  const ieltsTopics = filteredTopics.filter((t) => t.is_ielts);

  return (
    <>
      {/* Conversation Topics */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Badge
          variant={selectedTopic === null ? 'primary' : 'secondary'}
          onClick={() => onSelectTopic(null)}
          className="whitespace-nowrap"
        >
          📚 Tất cả
        </Badge>
        {conversationTopics.map((topic) => (
          <Badge
            key={topic.slug}
            variant={selectedTopic === topic.slug ? 'primary' : 'secondary'}
            onClick={() => onSelectTopic(topic.slug)}
            className="whitespace-nowrap"
            style={
              selectedTopic === topic.slug
                ? { backgroundColor: (topic.color || colors.skyBlue) + '30' }
                : undefined
            }
          >
            {topic.icon} {topic.name_vi}
          </Badge>
        ))}
      </div>

      {/* IELTS Topics */}
      {ieltsTopics.length > 0 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-hide">
          {ieltsTopics.map((topic) => (
            <Badge
              key={topic.slug}
              variant={selectedTopic === topic.slug ? 'primary' : 'secondary'}
              onClick={() => onSelectTopic(topic.slug)}
              className="whitespace-nowrap"
              style={{
                backgroundColor:
                  selectedTopic === topic.slug
                    ? colors.electricPurple + '30'
                    : colors.lightGray,
              }}
            >
              🎯 {topic.name}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}
