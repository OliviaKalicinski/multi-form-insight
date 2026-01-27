import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformWithProducts } from "@/types/marketing";
import { useState } from "react";

interface FinancialBreakdownCardProps {
  grossRevenue: number;
  shippingCost: number;
  costPercentage?: number;
  platformBreakdown?: PlatformWithProducts[];
  maxProductsPerChannel?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(value);
};

// Platform colors for visual distinction
const PLATFORM_COLORS: Record<string, string> = {
  'Amazon': 'hsl(32, 100%, 50%)',      // Orange
  'Shopify': 'hsl(94, 43%, 51%)',      // Green
  'Mercado Livre': 'hsl(48, 100%, 50%)', // Yellow
  'Base': 'hsl(239, 84%, 67%)',        // Purple/Indigo
};

const getPlatformColor = (platform: string): string => {
  return PLATFORM_COLORS[platform] || 'hsl(var(--muted-foreground))';
};

export const FinancialBreakdownCard = ({ 
  grossRevenue, 
  shippingCost,
  costPercentage = 0.65,
  platformBreakdown = [],
  maxProductsPerChannel = 5
}: FinancialBreakdownCardProps) => {
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  
  const netRevenue = grossRevenue - shippingCost;
  const costOfGoods = netRevenue * costPercentage;
  const grossProfit = netRevenue - costOfGoods;
  const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  const shippingPercent = grossRevenue > 0 ? (shippingCost / grossRevenue) * 100 : 0;
  const costPercent = costPercentage * 100;

  const togglePlatform = (platform: string) => {
    setExpandedPlatforms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Demonstrativo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Receita Bruta */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Receita Bruta</span>
          <div className="text-right">
            <span className="font-semibold">{formatCurrency(grossRevenue)}</span>
            <span className="text-xs text-muted-foreground ml-2">[100%]</span>
          </div>
        </div>

        {/* Frete */}
        <div className="flex justify-between items-center text-muted-foreground">
          <span className="text-sm">(-) Frete</span>
          <div className="text-right">
            <span className="text-sm">{formatCurrency(shippingCost)}</span>
            <span className="text-xs ml-2">[-{shippingPercent.toFixed(1)}%]</span>
          </div>
        </div>

        <div className="border-t border-dashed pt-2" />

        {/* Receita Líquida */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Receita Líquida</span>
          <div className="text-right">
            <span className="font-semibold">{formatCurrency(netRevenue)}</span>
            <span className="text-xs text-muted-foreground ml-2">[{(100 - shippingPercent).toFixed(1)}%]</span>
          </div>
        </div>

        {/* Platform Breakdown (hierarchical) */}
        {platformBreakdown.length > 0 && (
          <div className="space-y-1 pl-2 border-l-2 border-muted ml-1">
            {platformBreakdown.map((platform, platformIdx) => {
              const isLast = platformIdx === platformBreakdown.length - 1;
              const isExpanded = expandedPlatforms.has(platform.platform);
              const hasProducts = platform.products.length > 0;
              const connector = isLast ? '└─' : '├─';
              
              return (
                <div key={platform.platform} className="space-y-1">
                  {/* Platform Row */}
                  <div 
                    className={cn(
                      "flex justify-between items-center py-0.5 rounded-sm transition-colors",
                      hasProducts && "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={() => hasProducts && togglePlatform(platform.platform)}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground font-mono">{connector}</span>
                      {hasProducts && (
                        isExpanded 
                          ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span 
                        className="text-sm font-medium"
                        style={{ color: getPlatformColor(platform.platform) }}
                      >
                        {platform.platform}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{formatCurrency(platform.revenue)}</span>
                      <span className="text-xs text-muted-foreground ml-2">[{platform.marketShare.toFixed(1)}%]</span>
                    </div>
                  </div>

                  {/* Products (expanded) */}
                  {isExpanded && hasProducts && (
                    <div className="ml-6 space-y-0.5 border-l border-dashed border-muted pl-2">
                      {platform.products.slice(0, maxProductsPerChannel).map((product, productIdx) => {
                        const isLastProduct = productIdx === Math.min(platform.products.length, maxProductsPerChannel) - 1;
                        const productConnector = isLastProduct ? '└─' : '├─';
                        
                        return (
                          <div 
                            key={product.productName} 
                            className="flex justify-between items-center py-0.5"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground font-mono">{productConnector}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={product.productName}>
                                {product.productName}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground">{formatCurrency(product.revenue)}</span>
                              <span className="text-xs text-muted-foreground/70 ml-1">[{product.percentage.toFixed(1)}%]</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Custo */}
        <div className="flex justify-between items-center text-muted-foreground">
          <span className="text-sm">(-) Custo ({costPercent.toFixed(0)}%)</span>
          <div className="text-right">
            <span className="text-sm">{formatCurrency(costOfGoods)}</span>
            <span className="text-xs ml-2">[-{(costPercent * (100 - shippingPercent) / 100).toFixed(1)}%]</span>
          </div>
        </div>

        <div className="border-t border-dashed pt-2" />

        {/* Lucro Bruto */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Lucro Bruto</span>
          <div className="text-right">
            <span className={cn(
              "font-semibold",
              grossProfit >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(grossProfit)}
            </span>
          </div>
        </div>

        {/* Margem */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm font-medium">Margem de Contribuição</span>
          <span className={cn(
            "font-bold text-lg",
            profitMargin >= 30 ? "text-green-600" : profitMargin >= 20 ? "text-yellow-600" : "text-red-600"
          )}>
            {profitMargin.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
