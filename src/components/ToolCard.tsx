import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

export default function ToolCard({ icon: Icon, title, description, href }: ToolCardProps) {
  return (
    <Card className="group hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-1 border-blue-100/50">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-blue-300/30">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-lg font-bold text-blue-900 group-hover:text-blue-700 transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          asChild 
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
        >
          <Link to={href}>
            Gunakan Sekarang
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}