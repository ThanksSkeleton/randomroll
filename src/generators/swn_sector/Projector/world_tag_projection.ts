import descriptions from '../Data/Projection/world_tag_descriptions.json';
import type { WorldTag } from '../BaseDTO/merged_schema';
import type { WorldTagDisplayDTO } from '../DisplayDTO/dto';

export function projectWorldTag(tag: WorldTag): WorldTagDisplayDTO {
  return {
    tag,
    description:
      (descriptions.descriptions as Record<string, string>)[tag] ?? 'No description available.',
  };
}
