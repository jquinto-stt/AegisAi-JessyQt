import { ReactNode } from "react";

interface CardDescriptionProps {
  children: ReactNode;
}

/**
 * @kgId 6887c0113283
 */
const CardDescription: React.FC<CardDescriptionProps> = ({ children }) => {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>;
};

export default CardDescription;
