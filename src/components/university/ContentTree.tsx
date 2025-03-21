import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle, ForwardedRef } from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookOpen, Folder, FolderPlus, Pencil, Archive, ChevronDown, ChevronRight, Search, FileText, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { LucideIcon } from 'lucide-react';
import { GraduationCap } from 'lucide-react';
import * as universityService from '../../services/universityService';
import { fixOrderColumns } from '../../services/adminService';

// Define content item types
export type ContentItemType = 'program' | 'course' | 'lesson' | 'module';

// Define the tree item interface
export interface TreeItem {
  id: string;
  title: string;
  type: ContentItemType;
  parentId: string | null;
  children?: TreeItem[];
  order?: number;
  status?: string;
}

// Define the ContentTreeProps interface
export interface ContentTreeProps {
  onSelectItem: (item: TreeItem) => void;
  onAddItem: (parentItem: TreeItem | null, type: ContentItemType) => void;
  onEditItem: (item: TreeItem) => void;
  onArchiveItem: (item: TreeItem) => void;
}

// SortableTreeItem component for drag-and-drop functionality
const SortableTreeItem: React.FC<{
  item: TreeItem;
  level: number;
  onToggle: (id: string) => void;
  expandedItems: Set<string>;
  onSelect: (item: TreeItem) => void;
  selectedItem: TreeItem | null;
  onAddItem: (parentItem: TreeItem, type: ContentItemType) => void;
  onEditItem: (item: TreeItem) => void;
  onArchiveItem: (item: TreeItem) => void;
  isSearching: boolean;
}> = ({ 
  item, 
  level, 
  onToggle, 
  expandedItems, 
  onSelect,
  selectedItem,
  onAddItem,
  onEditItem,
  onArchiveItem,
  isSearching
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginLeft: `${level * 16}px`,
  };

  // Determine if the item has children and if it's expanded
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);
  const isSelected = selectedItem?.id === item.id;

  // Get the appropriate icon based on the item type
  const getIcon = (type: ContentItemType): LucideIcon => {
    switch (type) {
      case 'program':
        return GraduationCap;
      case 'course':
        return Folder;
      case 'lesson':
        return BookOpen;
      case 'module':
        return FileText;
      default:
        return FileText;
    }
  };

  // Get the item that can be added to this item based on its type
  const getAddableItemType = (type: ContentItemType): ContentItemType | null => {
    switch (type) {
      case 'program':
        return 'course';
      case 'course':
        return 'lesson';
      case 'lesson':
        return 'module';
      default:
        return null;
    }
  };

  // Get the color class based on the item type
  const getColorClass = (type: ContentItemType): string => {
    switch (type) {
      case 'program':
        return 'text-blue-600';
      case 'course':
        return 'text-green-600';
      case 'lesson':
        return 'text-purple-600';
      case 'module':
        return 'text-amber-600';
      default:
        return '';
    }
  };

  const IconComponent = getIcon(item.type);
  const addableItemType = getAddableItemType(item.type);
  const colorClass = getColorClass(item.type);

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center py-2 px-3 rounded-md ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'} cursor-pointer group`}
        onClick={() => onSelect(item)}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id);
            }}
            className="mr-1 focus:outline-none"
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        ) : (
          <span className="mr-5 w-4"></span> // Placeholder for alignment
        )}

        {/* Item icon */}
        <IconComponent size={18} className={`mr-2 ${colorClass}`} />

        {/* Item title */}
        <span 
          className="flex-grow truncate"
          {...(isSearching ? {} : { ...attributes, ...listeners })}
        >
          {item.title}
        </span>

        {/* Item actions */}
        <div className="ml-2 flex items-center opacity-0 group-hover:opacity-100">
          {/* Add button (if applicable) */}
          {addableItemType && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddItem(item, addableItemType);
                  }}
                >
                  <FolderPlus size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add {addableItemType}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Edit button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditItem(item);
                }}
              >
                <Pencil size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit {item.type}</p>
            </TooltipContent>
          </Tooltip>

          {/* Archive button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchiveItem(item);
                }}
              >
                <Archive size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Archive {item.type}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Render children if expanded or if searching */}
      {(isExpanded || isSearching) && hasChildren && item.children?.map((child) => (
        <SortableTreeItem
          key={child.id}
          item={child}
          level={level + 1}
          onToggle={onToggle}
          expandedItems={expandedItems}
          onSelect={onSelect}
          selectedItem={selectedItem}
          onAddItem={onAddItem}
          onEditItem={onEditItem}
          onArchiveItem={onArchiveItem}
          isSearching={isSearching}
        />
      ))}
    </div>
  );
};

// Main ContentTree component
const ContentTree = forwardRef<
  { refreshTree: () => Promise<void> },
  ContentTreeProps
>(({
  onSelectItem,
  onAddItem,
  onEditItem,
  onArchiveItem,
}, ref) => {
  const [items, setItems] = useState<TreeItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<TreeItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<TreeItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Only start dragging after a short delay or small movement
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch all items from the database
  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('ContentTree: Starting to fetch all content items');
      
      // Use universityService to fetch content hierarchy
      const { error, data } = await universityService.getContentHierarchy();
      
      if (error) {
        console.error('ContentTree: Error fetching content hierarchy:', error);
        setError(error || 'Failed to load content. Please try again.');
        // Always set empty array when there's an error to avoid undefined/null
        setItems([]);
        return;
      }
      
      // Check if data is valid and handle null/undefined case
      if (!data) {
        console.log('ContentTree: No content hierarchy data returned, using empty array');
        setItems([]);
        return;
      }
      
      // Improved handling for different API response formats
      console.log('ContentTree: Data structure check:', { 
        isArray: Array.isArray(data),
        type: typeof data, 
        hasSuccess: data && typeof data === 'object' && 'success' in data,
        hasData: data && typeof data === 'object' && 'data' in data
      });
      
      // Handle case where the API directly returns the array vs. {success: true, data: [...]}
      let processedData: TreeItem[] = [];
      
      if (Array.isArray(data)) {
        // Direct array response
        processedData = data;
      } else if (data && typeof data === 'object') {
        // Need to use type assertion since TypeScript doesn't know the structure
        const responseObj = data as Record<string, any>;
        if ('data' in responseObj && Array.isArray(responseObj.data)) {
          // {success: true, data: [...]} format
          processedData = responseObj.data;
        } else if ('success' in responseObj && responseObj.success === true) {
          // It has success: true but data might not be an array
          const nestedData = responseObj.data;
          processedData = Array.isArray(nestedData) ? nestedData : [];
        }
      }
      
      // Set the tree items directly from the processed data
      console.log('ContentTree: Successfully processed content hierarchy with',
        processedData.length, 'root items');
      
      setItems(processedData);
    } catch (error: any) {
      console.error('ContentTree: Critical error in fetchItems:', error);
      setError(`Failed to load content: ${error.message || 'Unknown error'}`);
      // Set empty items to avoid a completely blank screen
      setItems([]);
      
      // Try to fix order columns if the error indicates missing columns
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        try {
          console.log('ContentTree: Attempting to fix order columns');
          const result = await fixOrderColumns();
          if (result.success) {
            console.log('ContentTree: Successfully fixed order columns, retrying fetch');
            // Retry fetching after fixing columns
            setTimeout(() => fetchItems(), 1000);
          }
        } catch (fixError) {
          console.error('ContentTree: Error fixing order columns:', fixError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Expose refreshTree method via ref
  useImperativeHandle(ref, () => ({
    refreshTree: async () => {
      console.log('ContentTree: Starting tree refresh');
      try {
        await fetchItems();
        console.log('ContentTree: Tree refresh completed successfully');
      } catch (refreshError) {
        console.error('ContentTree: Critical error refreshing tree:', refreshError);
        // Add an error state without breaking the UI
        setError('Error refreshing content. Please try again or reload the page.');
        // Don't rethrow - we want to handle errors internally and not let them propagate
      }
    }
  }));
  
  // Initial data fetch
  useEffect(() => {
    fetchItems();
  }, []);

  // Function to toggle expansion of an item
  const toggleExpand = (id: string) => {
    setExpandedItems((prevExpanded) => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };

  // Function to expand parent nodes for matching search results
  const expandParents = (items: TreeItem[], searchTerm: string) => {
    try {
      console.log('ContentTree: Expanding parents for search term:', searchTerm);
      const newExpandedItems = new Set(expandedItems);
      
      // Create helper function to check and expand parents
      const checkAndExpandParents = (item: TreeItem, parentIds: string[] = []): boolean => {
        try {
          // Check if the current item matches
          const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Check if any children match
          let childrenMatch = false;
          if (item.children && item.children.length > 0) {
            childrenMatch = item.children.some(child => checkAndExpandParents(child, [...parentIds, item.id]));
          }
          
          // If this item or any children match, expand all parents
          if (matchesSearch || childrenMatch) {
            parentIds.forEach(id => newExpandedItems.add(id));
            return true;
          }
          
          return false;
        } catch (err) {
          console.error('ContentTree: Error in checkAndExpandParents:', err);
          return false;
        }
      };
      
      // Check each root item
      items.forEach(item => {
        try {
          checkAndExpandParents(item);
        } catch (err) {
          console.error('ContentTree: Error checking item in expandParents:', err, item);
        }
      });
      
      // Update expanded items state
      setExpandedItems(newExpandedItems);
      return newExpandedItems;
    } catch (err) {
      console.error('ContentTree: Error in expandParents:', err);
      // Don't modify expanded items if there's an error
      return expandedItems;
    }
  };

  // Function to handle item selection
  const handleSelectItem = (item: TreeItem) => {
    setSelectedItem(item);
    onSelectItem(item);
  };

  // Function to handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id.toString());
    
    // Find the active item from the items array
    const findItem = (items: TreeItem[], id: string): TreeItem | null => {
      for (const item of items) {
        if (item.id === id) {
          return item;
        }
        if (item.children && item.children.length > 0) {
          const found = findItem(item.children, id);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    
    const item = findItem(items, active.id.toString());
    if (item) {
      setActiveItem(item);
    }
  };

  /**
   * Handles the end of a drag-and-drop operation
   * Updates both client-side state and database order without page reload
   * @param event The drag end event containing information about the dragged item
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeId = active.id.toString();
      const overId = over.id.toString();
      
      // Find the items and their parents in the tree
      const findItemWithParentAndIndex = (
        items: TreeItem[],
        id: string,
        parent: TreeItem | null = null,
        parentList: TreeItem[] | null = null,
        index: number = -1
      ): { item: TreeItem | null; parent: TreeItem | null; parentList: TreeItem[] | null; index: number } => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.id === id) {
            return { item, parent, parentList: items, index: i };
          }
          if (item.children && item.children.length > 0) {
            const found = findItemWithParentAndIndex(item.children, id, item, item.children, i);
            if (found.item) {
              return found;
            }
          }
        }
        return { item: null, parent: null, parentList: null, index: -1 };
      };
      
      const { item: activeItem, parent: activeParent, parentList: activeParentList, index: activeIndex } = 
        findItemWithParentAndIndex(items, activeId);
      const { item: overItem, parent: overParent, parentList: overParentList, index: overIndex } = 
        findItemWithParentAndIndex(items, overId);
      
      // Client-side state update
      if (activeItem && overItem && activeParentList && overParentList && 
          activeItem.parentId === overItem.parentId) {
        
        setIsUpdating(true);
        
        try {
          // Update client-side state immediately for a responsive feel
          // Find the list containing the items being reordered
          const updateTreeItems = (items: TreeItem[]): TreeItem[] => {
            return items.map(item => {
              // If this item has children that include the active and over items
              if (item.children && 
                  item.children.some(child => child.id === activeId) && 
                  item.children.some(child => child.id === overId)) {
                
                // Reorder the children
                return {
                  ...item,
                  children: arrayMove(
                    [...item.children],
                    item.children.findIndex(child => child.id === activeId),
                    item.children.findIndex(child => child.id === overId)
                  )
                };
              }
              
              // If this is the parent list for the items (top level)
              if (activeParentList === items && 
                  items.some(i => i.id === activeId) && 
                  items.some(i => i.id === overId)) {
                
                // Return the reordered list
                return arrayMove(items, activeIndex, overIndex)[items.indexOf(item)];
              }
              
              // Otherwise, recursively check children
              if (item.children) {
                return {
                  ...item,
                  children: updateTreeItems(item.children)
                };
              }
              
              // No change for this item
              return item;
            });
          };
          
          // Update the tree state with reordered items
          setItems(prevItems => {
            // For top-level items
            if (activeParentList === items) {
              return arrayMove([...prevItems], activeIndex, overIndex);
            }
            // For nested items
            return updateTreeItems(prevItems);
          });
          
          // Calculate new order values - this is more robust than swapping
          const movedItems = arrayMove([...activeParentList], activeIndex, overIndex);
          const itemsToUpdate = movedItems.map((item, index) => {
            return {
              id: item.id,
              order: (index + 1) * 10 // 10, 20, 30... to leave room for insertion
            };
          });
          
          // Update items in the database using the service layer with batch operation
          const result = await universityService.batchReorderContent(
            activeItem.type, 
            itemsToUpdate
          );
          
          if (!result.success) {
            console.error(`ContentTree: Error reordering ${activeItem.type} items:`, result.error);
            // Could show an error toast or notification here
          } else {
            console.log(`ContentTree: Successfully reordered ${activeItem.type} items in database`);
          }
        } catch (error) {
          console.error('ContentTree: Error updating order in database:', error);
          // Could show an error toast or notification here
        } finally {
          setIsUpdating(false);
        }
      }
    }
    
    setActiveId(null);
    setActiveItem(null);
  };

  // Function to handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = e.target.value;
      setSearchTerm(value);
      
      if (value.trim()) {
        expandParents(items, value);
      }
    } catch (err) {
      console.error('ContentTree: Error in search handling:', err);
      // Don't let search errors crash the UI
      setSearchTerm('');
    }
  };

  // Function to clear the search
  const clearSearch = () => {
    try {
      console.log('ContentTree: Clearing search term');
      setSearchTerm('');
    } catch (err) {
      console.error('ContentTree: Error clearing search:', err);
    }
  };

  // Function to filter items by search term
  function filterItemsBySearch(items: TreeItem[], searchTerm: string): TreeItem[] {
    try {
      if (!searchTerm.trim()) {
        return items;
      }
      
      const normalizedSearchTerm = searchTerm.toLowerCase();
      const matchingItems: TreeItem[] = [];
      
      const searchInItem = (item: TreeItem): boolean => {
        // Check if this item matches
        const matchesTitle = item.title.toLowerCase().includes(normalizedSearchTerm);
        
        // Check if any children match
        let childrenMatch = false;
        if (item.children && item.children.length > 0) {
          childrenMatch = item.children.some(searchInItem);
        }
        
        // If this item or any children match, add to results
        if (matchesTitle || childrenMatch) {
          matchingItems.push(item);
          return true;
        }
        
        return false;
      };
      
      // Start search from all root items
      items.forEach(searchInItem);
      
      return matchingItems;
    } catch (err) {
      console.error('ContentTree: Error filtering items by search:', err);
      // Return all items if search fails
      return items;
    }
  }

  // Show loading state
  if (isLoading) {
    return <div className="flex items-center justify-center p-4">Loading content structure...</div>;
  }

  // Show error message
  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  // Define a function to render item icons with color
  const renderItemIcon = (type: ContentItemType, colorClass: string = "") => {
    const Icon = getIcon(type);
    return <Icon className={`h-4 w-4 ${colorClass || getColorClass(type)}`} />;
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Search input */}
      <div className="flex items-center bg-gray-50 border-b p-2">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            placeholder="Search content..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10 pr-10 py-2 text-sm border-gray-300 focus:border-blue-500 bg-white"
          />
          {searchTerm && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={clearSearch}
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading content...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-8 mx-3 my-4 rounded-md">
          <p className="font-semibold mb-2">There was a problem loading content</p>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              fetchItems();
            }}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-md text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Empty state */}
      {!isLoading && !error && items.length === 0 && (
        <div className="text-center py-10">
          <div className="text-gray-400 mb-2">
            <FolderPlus className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-500">No content found</h3>
          <p className="text-gray-400 mt-1 mb-4">Get started by creating a program.</p>
          <Button 
            onClick={() => onAddItem(null, 'program')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Program
          </Button>
        </div>
      )}
      
      {/* Content Tree */}
      {!isLoading && !error && items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-gray-100">
              {searchTerm 
                ? filterItemsBySearch(items, searchTerm).map(item => (
                    <SortableTreeItem
                      key={item.id}
                      item={item}
                      level={0}
                      onToggle={toggleExpand}
                      expandedItems={expandedItems}
                      onSelect={handleSelectItem}
                      selectedItem={selectedItem}
                      onAddItem={onAddItem}
                      onEditItem={onEditItem}
                      onArchiveItem={onArchiveItem}
                      isSearching={true}
                    />
                  ))
                : items.map(item => (
                    <SortableTreeItem
                      key={item.id}
                      item={item}
                      level={0}
                      onToggle={toggleExpand}
                      expandedItems={expandedItems}
                      onSelect={handleSelectItem}
                      selectedItem={selectedItem}
                      onAddItem={onAddItem}
                      onEditItem={onEditItem}
                      onArchiveItem={onArchiveItem}
                      isSearching={false}
                    />
                  ))
              }
            </div>
          </SortableContext>
          
          {/* Drag overlay */}
          <DragOverlay>
            {activeId && activeItem ? (
              <div className="border border-blue-300 bg-blue-50 rounded py-2 px-3 shadow-md">
                <div className="flex items-center space-x-2">
                  {renderItemIcon(activeItem.type, "text-blue-500")}
                  <span className="font-medium text-blue-800">{activeItem.title}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      
      {/* Add Program button at the bottom */}
      <div className="p-3 border-t bg-gray-50">
        <Button 
          onClick={() => onAddItem(null, 'program')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          Add Program
        </Button>
      </div>
      
      {/* Update status message */}
      {isUpdating && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white py-2 px-4 rounded-md shadow-lg z-50 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
          <span>Updating content order...</span>
        </div>
      )}
    </div>
  );
});

// Helper function to get an icon based on the item type
function getIcon(type: ContentItemType): LucideIcon {
  switch (type) {
    case 'program':
      return GraduationCap;
    case 'course':
      return Folder;
    case 'lesson':
      return BookOpen;
    case 'module':
      return FileText;
    default:
      return FileText;
  }
}

// Helper function to get the color class based on the item type
function getColorClass(type: ContentItemType): string {
  switch (type) {
    case 'program':
      return 'text-blue-600';
    case 'course':
      return 'text-green-600';
    case 'lesson':
      return 'text-purple-600';
    case 'module':
      return 'text-amber-600';
    default:
      return '';
  }
}

export default ContentTree; 