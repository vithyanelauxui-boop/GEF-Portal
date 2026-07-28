import { Card } from "@/components/polaris/ui";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="max-w-[1000px] mx-auto px-6 py-10">
      <h1 className="text-[26px] font-semibold sp-display mb-5">{title}</h1>
      <Card className="py-16 text-center">
        <p className="text-[15px] font-medium text-foreground">Nothing here yet</p>
        <p className="text-[13px] text-muted-foreground mt-1">This area is out of scope for the current prototype.</p>
      </Card>
    </div>
  );
}
