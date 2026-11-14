import dynamic from "next/dynamic";
const Reports = dynamic(() =>
  import("@/components/reports").then((m) => m.Reports),
);
export default function Page() {
  return <Reports />;
}
