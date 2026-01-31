"use strict";
import { Game } from "./Game.js";
const container = document.getElementById("app");
const game = new Game(container);
window.addEventListener("resize", () => {
  game.onWindowResize();
});