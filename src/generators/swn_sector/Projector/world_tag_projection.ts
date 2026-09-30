import descriptions from '../Data/Raw/Details/world_tags.json';
import type { WorldTag } from '../BaseDTO/merged_schema';
import type { WorldTagDisplayDTO } from '../DisplayDTO/dto';

export function projectWorldTag(tag: WorldTag): WorldTagDisplayDTO {
  return {
    tag,
    description:
      (descriptions.tags as Record<string, { description?: string }>)[tag]?.description ?? 'No description available.',
  };
}
