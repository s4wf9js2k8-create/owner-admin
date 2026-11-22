import React, { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
export default function AssetExtras({ org, asset, onUpdate, canEdit }) {
  const [message, setMessage] = useState("");
  const url = useMemo(() => {
    const u = new URL(location.href);
    u.hash = new URLSearchParams({
      workspace: org.id,
      module: asset.module,
      record: asset.id,
    }).toString();
    return u.href;
  }, [org.id, asset.module, asset.id]);
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 3, margin: 4, scalable: true });
  }, [url]);
  return (
    <section className="completion-workspace">
      <details>
        <summary>Purchase, warranty and asset label</summary>
        {canEdit && (
          <form
            key={asset.id}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (
                await onUpdate(org.id, asset.id, {
                  ...f,
                  purchaseCost:
                    f.purchaseCost === "" ? "" : Number(f.purchaseCost),
                })
              )
                setMessage("Asset purchase and warranty details saved.");
            }}
          >
            <label>
              Purchase date
              <input
                name="purchaseDate"
                type="date"
                defaultValue={asset.purchaseDate || ""}
              />
            </label>
            <label>
              Purchase cost (£)
              <input
                name="purchaseCost"
                type="number"
                min="0"
                max="100000000"
                step=".01"
                defaultValue={asset.purchaseCost ?? ""}
              />
            </label>
            <label>
              Purchase reference
              <input
                name="purchaseReference"
                maxLength={100}
                defaultValue={asset.purchaseReference || ""}
              />
            </label>
            <label>
              Warranty expiry
              <input
                name="warrantyUntil"
                type="date"
                defaultValue={asset.warrantyUntil || ""}
              />
            </label>
            <button>Save purchase details</button>
          </form>
        )}
        <div className="asset-qr-label">
          <h3>{asset.asset || asset.title}</h3>
          <div
            role="img"
            aria-label={"QR code opening " + asset.title}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p>{asset.title}</p>
          <a href={url}>Open mobile asset profile</a>
          <p>
            Camera scanning uses your device’s QR reader. New session-only
            assets cannot be recovered after refresh.
          </p>
        </div>
        <button
          onClick={() => {
            const blob = new Blob([svg], { type: "image/svg+xml" }),
              u = URL.createObjectURL(blob),
              a = document.createElement("a");
            a.href = u;
            a.download = "asset-" + (asset.asset || asset.id) + ".svg";
            a.click();
            setTimeout(() => URL.revokeObjectURL(u), 1000);
          }}
        >
          Download asset QR label
        </button>
        {message && <p role="status">{message}</p>}
      </details>
    </section>
  );
}
