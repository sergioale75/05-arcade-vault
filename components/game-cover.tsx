// Cover art is generated entirely in CSS (see the .cover-* rules in globals.css),
// so a cover is just a positioned div carrying the right class.
export function GameCover({ cover }: { cover: string }) {
  return <div className={"cover-bg " + cover} />;
}
