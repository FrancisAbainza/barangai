export interface SectionHeadingProps {
  // Rendered as "TITLE HIGHLIGHT", with the highlight in the primary color.
  title: string;
  highlight: string;
  description: string;
}

export default function SectionHeading({ title, highlight, description }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
        {title} <span className="text-primary">{highlight}</span>
      </h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
