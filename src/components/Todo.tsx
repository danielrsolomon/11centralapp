import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export function Todo() {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: "Complete training module", completed: false },
    { id: 2, text: "Review schedule for next week", completed: false },
    { id: 3, text: "Submit time off request", completed: true },
  ]);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = () => {
    if (newTodo.trim() === "") return;
    
    const newItem: TodoItem = {
      id: Date.now(),
      text: newTodo,
      completed: false
    };
    
    setTodos([...todos, newItem]);
    setNewTodo("");
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center mb-6">
        <CheckSquare className="h-6 w-6 text-primary mr-2" />
        <h2 className="text-xl font-semibold">My Tasks</h2>
      </div>
      
      <div className="flex mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new task..."
          className="flex-grow px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
        />
        <button 
          onClick={addTodo}
          className="bg-primary text-white px-4 py-2 rounded-r-md hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      
      <ul className="space-y-2">
        {todos.map(todo => (
          <li 
            key={todo.id} 
            className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary mr-3"
              />
              <span className={todo.completed ? "line-through text-gray-500" : ""}>
                {todo.text}
              </span>
            </div>
            <button 
              onClick={() => deleteTodo(todo.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      
      <div className="mt-4 text-sm text-gray-500">
        {todos.filter(t => t.completed).length} of {todos.length} tasks completed
      </div>
    </div>
  );
} 