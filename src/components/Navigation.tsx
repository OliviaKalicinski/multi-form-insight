import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">📊 Dashboard de Marketing</h1>
        </div>
        
        <Tabs value={currentPath} onValueChange={(path) => navigate(path)}>
          <TabsList>
            <TabsTrigger value="/">📊 Visão Geral</TabsTrigger>
            <TabsTrigger value="/ads">💰 Ads</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};
