'use client';

import { Card, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { Sparkles } from 'lucide-react';


interface PagePlaceholderProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features?: string[];
  children?: React.ReactNode;
}

export function PagePlaceholder({ title, description, icon: Icon, color, features, children }: PagePlaceholderProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-ink-500 mt-1">{description}</p>
      </div>

      <Card className="relative overflow-hidden">
        <div className={cn('absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 bg-gradient-to-br', color)} />
        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className={cn('w-16 h-16 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center mb-6 shadow-premium-lg', color)}>
              <Icon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-ink-500 mb-6">{description}</p>

            {features && features.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 w-full mb-8">
                {features.map(feature => (
                  <div key={feature} className="flex items-center gap-2 p-3 rounded-lg border border-ink-200 dark:border-ink-800 text-left">
                    <Sparkles className="w-4 h-4 text-mkopa-green flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="primary">Enterprise Grade</Badge>
              <Badge variant="info">Real-time</Badge>
              <Badge variant="success">Production Ready</Badge>
            </div>

            {children}
          </div>
        </div>
      </Card>
    </div>
  );
}
