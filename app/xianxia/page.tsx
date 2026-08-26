import type { Metadata } from "next";
import XianxiaExperience, { XianxiaMaterialPreview, type PublicXianxiaStory } from "./XianxiaExperience";
import { getXianxiaStory, type XianxiaStory } from "./story-packages";
import "./xianxia.css";

export const metadata: Metadata = {
  title: "稳字经｜互动仙侠故事",
  description: "在小琼峰的日常与封神暗流之间，亲手决定李长寿如何把稳健变成共同的活路。",
};

function toPublicStory(story: XianxiaStory): PublicXianxiaStory {
  return {
    id: story.id,
    title: story.title,
    subtitle: story.subtitle,
    logline: story.logline,
    accent: story.accent,
    playerRole: story.playerRole,
    introduction: story.introduction,
    threeAct: story.threeAct,
    chapters: story.chapters,
    characters: story.characters.map(({ id, name, role, shortBio, portrait, featured }) => ({
      id,
      name,
      role,
      shortBio,
      portrait,
      featured,
    })),
    opening: { events: story.opening.events, choices: story.opening.choices },
    initialHud: story.initialHud,
    chapterBackgrounds: story.chapterBackgrounds,
    chapterEndPreviews: story.chapterEndPreviews,
    backgroundMusic: story.backgroundMusic,
  };
}

export default async function XianxiaPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const params = await searchParams;
  const selected = getXianxiaStory("steady-dao");
  if (!selected) return null;
  const story = toPublicStory(selected);
  if (params.preview === "materials") return <XianxiaMaterialPreview story={story} />;
  return <XianxiaExperience story={story} />;
}
