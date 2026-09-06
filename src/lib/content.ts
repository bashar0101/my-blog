import type { Profile, Project, UiDict, Video } from "../types";
import profileJson from "../content/profile.json";
import projectsJson from "../content/projects.json";
import videosJson from "../content/videos.json";
import uiJson from "../content/ui.json";

export const profile = profileJson as Profile;
export const ui = uiJson as UiDict;

const projects = (projectsJson as Project[]).slice().sort((a, b) => a.order - b.order);
const videos = (videosJson as Video[]).slice().sort((a, b) => a.order - b.order);

export function allProjects(): Project[] {
  return projects;
}

export function featuredProjects(limit = 3): Project[] {
  return projects.filter((p) => p.featured).slice(0, limit);
}

export function allVideos(): Video[] {
  return videos;
}

export function featuredVideos(limit = 2): Video[] {
  return videos.filter((v) => v.featured).slice(0, limit);
}
