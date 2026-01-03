import { useState } from 'react';
import { GripVertical, X, Plus, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type ChecklistItemType = 'checkbox' | 'single_line' | 'multi_line' | 'dropdown' | 'signature' | 'image';

export interface ChecklistItemData {
  id?: string;
  item_text: string;
  item_type: ChecklistItemType;
  options?: string[];
  is_required: boolean;
  sort_order: number;
}

interface ChecklistItemEditorProps {
  item: ChecklistItemData;
  index: number;
  onChange: (index: number, item: ChecklistItemData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

const ITEM_TYPE_LABELS: Record<ChecklistItemType, string> = {
  checkbox: 'Checkbox',
  single_line: 'Single Line Text',
  multi_line: 'Multi Line Text',
  dropdown: 'Dropdown',
  signature: 'Signature',
  image: 'Image Capture',
};

const ITEM_TYPE_ICONS: Record<ChecklistItemType, string> = {
  checkbox: '☑',
  single_line: 'Aa',
  multi_line: '¶',
  dropdown: '▼',
  signature: '✍',
  image: '📷',
};

export function ChecklistItemEditor({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
}: ChecklistItemEditorProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleFieldChange = (field: keyof ChecklistItemData, value: any) => {
    onChange(index, { ...item, [field]: value });
  };

  const handleOptionChange = (optIndex: number, value: string) => {
    const newOptions = [...(item.options || [])];
    newOptions[optIndex] = value;
    handleFieldChange('options', newOptions);
  };

  const handleAddOption = () => {
    handleFieldChange('options', [...(item.options || []), '']);
  };

  const handleRemoveOption = (optIndex: number) => {
    const newOptions = (item.options || []).filter((_, i) => i !== optIndex);
    handleFieldChange('options', newOptions);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-lg w-8">{ITEM_TYPE_ICONS[item.item_type]}</span>
            <div className="flex-1 min-w-0">
              <span className={cn(
                "truncate block",
                !item.item_text && "text-muted-foreground italic"
              )}>
                {item.item_text || `Item ${index + 1}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {ITEM_TYPE_LABELS[item.item_type]}
                {item.is_required && ' • Required'}
              </span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              disabled={!canRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t pt-3">
            {/* Label/Question */}
            <div className="space-y-1">
              <Label className="text-xs">Label / Question</Label>
              <Input
                value={item.item_text}
                onChange={(e) => handleFieldChange('item_text', e.target.value)}
                placeholder="Enter label or question..."
              />
            </div>

            {/* Field Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Field Type</Label>
                <Select
                  value={item.item_type}
                  onValueChange={(value: ChecklistItemType) => {
                    handleFieldChange('item_type', value);
                    // Initialize options for dropdown
                    if (value === 'dropdown' && (!item.options || item.options.length === 0)) {
                      handleFieldChange('options', ['Option 1', 'Option 2']);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkbox">☑ Checkbox</SelectItem>
                    <SelectItem value="single_line">Aa Single Line Text</SelectItem>
                    <SelectItem value="multi_line">¶ Multi Line Text</SelectItem>
                    <SelectItem value="dropdown">▼ Dropdown</SelectItem>
                    <SelectItem value="signature">✍ Signature</SelectItem>
                    <SelectItem value="image">📷 Image Capture</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`required-${index}`}
                    checked={item.is_required}
                    onCheckedChange={(checked) => handleFieldChange('is_required', checked)}
                  />
                  <Label htmlFor={`required-${index}`} className="text-sm">
                    Required
                  </Label>
                </div>
              </div>
            </div>

            {/* Dropdown Options */}
            {item.item_type === 'dropdown' && (
              <div className="space-y-2">
                <Label className="text-xs">Dropdown Options</Label>
                <div className="space-y-2">
                  {(item.options || []).map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(optIndex, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="h-8"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveOption(optIndex)}
                        disabled={(item.options?.length || 0) <= 1}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  className="gap-1 h-7 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Add Option
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface AddItemButtonProps {
  onAdd: (type: ChecklistItemType) => void;
}

export function AddItemButton({ onAdd }: AddItemButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-1"
      >
        <Plus className="h-3 w-3" />
        Add Field
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 top-full mt-1 z-20 bg-popover border rounded-md shadow-lg p-1 min-w-[180px]">
            {(Object.keys(ITEM_TYPE_LABELS) as ChecklistItemType[]).map((type) => (
              <button
                key={type}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded flex items-center gap-2"
                onClick={() => {
                  onAdd(type);
                  setIsOpen(false);
                }}
              >
                <span className="w-6">{ITEM_TYPE_ICONS[type]}</span>
                {ITEM_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
