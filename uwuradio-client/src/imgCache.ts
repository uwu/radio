const cache: Array<HTMLImageElement> = [];

export function cacheImage(url: string) {
  cache.shift();

  const image = new Image();
  image.src = url;

  cache.push(image);
}
