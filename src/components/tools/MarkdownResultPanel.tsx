import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';

interface MarkdownResultPanelProps {
  title: string;
  markdown: string;
  onReset: () => void;
}

export default function MarkdownResultPanel({
  title,
  markdown,
  onReset,
}: MarkdownResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast({
        title: 'Disalin',
        description: 'Output berhasil disalin ke clipboard.',
      });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: 'Gagal menyalin',
        description: 'Browser tidak mengizinkan akses clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-blue-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-blue-950">{title}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Salin
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[520px]">
        <div className="p-5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-4 text-2xl font-bold text-slate-950">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-3 mt-6 text-xl font-semibold text-slate-900">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-5 text-lg font-semibold text-slate-900">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 leading-7 text-slate-700">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 ml-5 list-disc space-y-2 text-slate-700">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-4 ml-5 list-decimal space-y-2 text-slate-700">{children}</ol>
              ),
              li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="mb-4 border-l-4 border-blue-200 pl-4 text-slate-600">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-slate-200 px-3 py-2 text-slate-700">{children}</td>
              ),
              code: ({ children }) => (
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-900">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="mb-4 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">
                  {children}
                </pre>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </div>
  );
}
