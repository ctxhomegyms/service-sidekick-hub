import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number | null;
}

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  const handleAdd = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: null,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<LineItem>) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const total = items.reduce((sum, item) => {
    if (item.unitPrice) {
      return sum + (item.quantity * item.unitPrice);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-3 text-right">Unit Price</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items */}
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <Input
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) => handleUpdate(item.id, { description: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
                  className="h-9 text-center"
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.unitPrice || ''}
                  onChange={(e) => handleUpdate(item.id, { unitPrice: parseFloat(e.target.value) || null })}
                  className="h-9 text-right"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Total */}
          {total > 0 && (
            <div className="flex justify-end pt-2 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="gap-2">
        <Plus className="w-4 h-4" />
        Add Line Item
      </Button>
    </div>
  );
}
