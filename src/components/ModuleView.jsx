import React from "react";

export default function ModuleView({ html }) {
  return <div className="page" dangerouslySetInnerHTML={{ __html: html }} />;
}
