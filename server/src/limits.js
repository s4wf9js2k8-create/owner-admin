/** Bound buffered file requests, including abandoned in-flight handlers. */
export function fileConcurrencyGate(limit = 4) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 16)
    throw new Error("Invalid file concurrency limit");
  let active = 0;
  return (req, res, next) => {
    if (active >= limit) return res.status(429).json({ error: "RATE_LIMITED" });
    active++;
    let terminal = false,
      started = false,
      done = false,
      released = false;
    const release = () => {
      if (terminal && (!started || done) && !released) {
        released = true;
        active--;
      }
    };
    req.fileLease = {
      start() {
        if (terminal) return false;
        started = true;
        return true;
      },
      done() {
        done = true;
        release();
      },
    };
    const end = () => {
      terminal = true;
      release();
    };
    res.once("finish", end);
    res.once("close", end);
    next();
  };
}
