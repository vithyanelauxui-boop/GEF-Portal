import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground text-sm">
            {description || `The ${title} page is coming soon.`}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
