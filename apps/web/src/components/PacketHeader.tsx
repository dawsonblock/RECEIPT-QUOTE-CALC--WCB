import type { ReceiptPacket } from "@wcb/shared";

interface PacketHeaderProps {
  packet: ReceiptPacket;
  onChange: (patch: Partial<ReceiptPacket>) => void;
}

export function PacketHeader({ packet, onChange }: PacketHeaderProps) {
  return (
    <section className="panel packet-header">
      <div>
        <h1>{packet.packetTitle}</h1>
        <p>Prepared Date: {packet.preparedDate}</p>
      </div>
      <div className="field-row">
        <label>
          Claimant Name
          <input value={packet.claimantName} onChange={(event) => onChange({ claimantName: event.target.value })} />
        </label>
        <label>
          Claim Number
          <input value={packet.claimNumber} onChange={(event) => onChange({ claimNumber: event.target.value })} placeholder="Required for export" />
        </label>
      </div>
    </section>
  );
}
