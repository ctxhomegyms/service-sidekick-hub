import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface FloorAccessInputProps {
  form: UseFormReturn<any>;
}

export function FloorAccessInput({ form }: FloorAccessInputProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="floor_level"
        render={({ field }) => (
          <FormItem>
            <FormLabel>What floor is the equipment on? *</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="first_floor" id="first_floor" />
                  <Label htmlFor="first_floor" className="cursor-pointer flex-1">First Floor</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="second_floor" id="second_floor" />
                  <Label htmlFor="second_floor" className="cursor-pointer flex-1">Second Floor</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="third_floor_plus" id="third_floor_plus" />
                  <Label htmlFor="third_floor_plus" className="cursor-pointer flex-1">Third Floor+</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="basement" id="basement" />
                  <Label htmlFor="basement" className="cursor-pointer flex-1">Basement</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Access Options</Label>
        <div className="flex flex-col space-y-2">
          <FormField
            control={form.control}
            name="has_elevator"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  Elevator available
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="has_stairs"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  Stairs required
                </FormLabel>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
