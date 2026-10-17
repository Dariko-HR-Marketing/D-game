import type { TourId } from "../tours";
import type { IconName } from "./Icon";
/** Yo'riqnoma qadamlari: yoritiladigan element (`testID`) va ikonka. Matnlar `uz.tour[id]` da (bir xil tartibda, bir xil soni). */
export const TOUR_META: Record<TourId, { target?: string; icon: IconName }[]> = {
  home: [{ icon: "star" }, { target: "home-new", icon: "dice" }, { target: "home-nav", icon: "home" }],
  lobby: [{ target: "lobby-code", icon: "share" }, { target: "lobby-events", icon: "alert" }],
  dreams: [{ icon: "star" }, { icon: "flag" }],
  "game-small": [{ target: "board", icon: "board" }, { target: "turn-panel", icon: "dice" }, { target: "timebar", icon: "clock" }, { target: "board", icon: "search" }, { icon: "file" }, { target: "finance", icon: "chart" }, { target: "actions", icon: "bank" }, { target: "timebar", icon: "timer" }, { target: "sound-toggle", icon: "volume" }],
  "game-big": [{ target: "board", icon: "board" }, { target: "timebar", icon: "clock" }, { target: "board", icon: "search" }, { icon: "people" }, { target: "timebar", icon: "timer" }],
  result: [{ icon: "chart" }], profile: [{ icon: "person" }], leaderboard: [{ icon: "trophy" }], shop: [{ icon: "star" }], class: [{ icon: "house" }], tournaments: [{ icon: "flag" }],
};
