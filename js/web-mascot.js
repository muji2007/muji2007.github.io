import {
  configure,
  createMascot
} from "/vendor/web-mascot/dist/index.js";

configure({
  assets: "/vendor/web-mascot/dist/mascot_pack",
  animationConfigUrl: "/vendor/web-mascot/dist/animation.config.json"
});

try {
  window.blogMascots = await Promise.all([
    createMascot({ container: document.body, pack: "Neuron" }),
    createMascot({ container: document.body, pack: "Eviling" })
  ]);
} catch (error) {
  console.warn("桌宠加载失败：", error);
}