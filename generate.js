CSL = require("./citeproc_commonjs.js");
fs = require("fs");


CSL.Output.Formats.html["@display/left-margin"] = function (state, str) {
    return str + " ";
};
CSL.Output.Formats.html["@display/right-inline"] = function (state, str) {
    return str;
};


function make_citeproc_sys(items) {
    bib = {};
    for (var item of items) {
        bib[item.id] = item;
    }
    var citeproc_sys = {
        retrieveLocale: function (lang) {
            var file_path = "./locales/locales-" + lang + ".xml";
            if (fs.existsSync(file_path)) {
                return fs.readFileSync(file_path, "utf8");
            } else {
                console.error(`Cannot find "${file_path}".`);
                return {};
            }
        },
        retrieveItem: function (id) {
            var item = bib[id];
            if (item) {
                return bib[id];
            } else {
                console.error(`Cannot find item "${id}".`);
                return {};
            }
        },
    };
    return citeproc_sys;
}


function make_citations(citeproc, cite_items_list) {
    var citation_res = [];

    var citation_count = 0;
    var citation_pre = [];
    var citation_post = [];

    for (var cite_items of cite_items_list) {
        citation_count += 1;
        citaiton_id = "CITATION-" + citation_count;
        var citation = {
            "citationID": citaiton_id,
            "citationItems": cite_items,
            "properties": {
                "noteIndex": citation_count
            }
        };
        var citation_items = citeproc.processCitationCluster(citation, citation_pre, citation_post)[1];

        for (var citation_item of citation_items) {
            var index = citation_item[0];
            var citaiton_text = citation_item[1];
            citation_res[index] = citaiton_text;
        }

        citation_pre.push([citaiton_id, citation_count]);
    }

    var res = "";
    if (citation_res.length > 0) {
        if (citation_res.length > 1) {
            res += "<blockquote>\n";
            for (var [index, text] of citation_res.entries()) {
                if (citeproc.opt.xclass == "note") {
                    res += "  <sup>" + (index+1) + "</sup> " + text + "<br>\n";
                } else {
                    res += "  " + text + "<br>\n";
                }
            }
            res += "</blockquote>";
        } else {
            res = "> " + citation_res[0];
        }
    }

    return res;
}


function make_bibliography(citeproc) {
    var res = "";
    var params, bib_items;
    try {
        [params, bib_items] = citeproc.makeBibliography();
        res += "<blockquote>\n";
        res += "  " + params.bibstart;
        for (var bib_item of bib_items) {
            res += "  " + bib_item;
        }
        res += "  " + params.bibend + "\n";
        res += "</blockquote>";
    } catch (TypeError) {
        res += "false";
    }
    return res;
}


function main() {
    var test_data = JSON.parse(fs.readFileSync("test-data.json", "utf8"));
    var gbt7714_data = JSON.parse(fs.readFileSync("gbt7714-data.json", "utf8"));

    var full_data = gbt7714_data.concat(test_data);

    var citeproc_sys = make_citeproc_sys(full_data);
    var csl_style = fs.readFileSync("style.csl", "utf8");

    var citeproc = new CSL.Engine(citeproc_sys, csl_style);
    citeproc.opt.development_extensions.wrap_url_and_doi = true;
    // citeproc.opt.development_extensions.csl_reverse_lookup_support = true;

    var citation_format = "numeric";
    var category_nodes = citeproc.cslXml.getNodesByName(citeproc.cslXml.dataObj, "category");
    for (var node of category_nodes) {
        if ("citation-format" in node.attrs) {
            citation_format = node.attrs["citation-format"];
            break;
        }
    }

    var gbt7714_cite_file = "gbt7714-cites-" + citation_format + ".json";
    var gbt7714_cite_dict = JSON.parse(fs.readFileSync(gbt7714_cite_file, "utf8"));

    var test_cite_file = "test-cites.json";
    var cite_items_dict = JSON.parse(fs.readFileSync(test_cite_file, "utf8"));

    var res = "## Example citations\n\n";
    var example_cite_list = cite_items_dict["example"];
    if (example_cite_list && example_cite_list.length > 0) {
        res += make_citations(citeproc, example_cite_list) + "\n";
    } else if (test_data.length > 0) {
        example_cite_list = [];
        for (var item of test_data) {
            example_cite_list.push([{ "id": item.id }]);
        }
        example_cite_list.sort(function (a, b) {
            const id1 = a[0].id;
            const id2 = b[0].id;
            if (id1 < id2) {
                return -1;
            } else if (id1 > id2) {
                return 1;
            } else {
                return 0;
            }
        });
        res += make_citations(citeproc, example_cite_list) + "\n";
    } else {
        example_cite_list = gbt7714_cite_dict["example"];
        res += make_citations(citeproc, example_cite_list) + "\n";
    }
    res += "\n## Example bibliography\n\n";
    if (example_cite_list && example_cite_list.length > 0) {
        res += make_bibliography(citeproc) + "\n";
    }

    res += "\n\n## Test citations\n\n";
    citeproc.updateItems([]);
    var test_cite_list = cite_items_dict["test"];
    if (test_cite_list && test_cite_list.length > 0) {
        res += make_citations(citeproc, test_cite_list) + "\n";
    }
    res += "\n## Test bibliography\n\n";
    if (test_cite_list && test_cite_list.length > 0) {
        res += make_bibliography(citeproc) + "\n";
    }
    res += "\n## Test full bibliography\n\n";
    if (test_data.length > 0) {
        var ids = [];
        for (var item of test_data) {
            ids.push(item.id);
        }
        ids.sort();
        citeproc.updateItems(ids);
        res += make_bibliography(citeproc) + "\n";
    }

    res += "\n\n## GB/T 7714 test citations\n\n";
    citeproc.updateItems([]);
    test_cite_list = gbt7714_cite_dict["test"];
    res += make_citations(citeproc, test_cite_list) + "\n";
    res += "\n## GB/T 7714 test bibliography\n\n";
    res += make_bibliography(citeproc) + "\n";

    res += "\n## GB/T 7714 full bibliography\n\n";
    var ids = [];
    for (var item of gbt7714_data) {
        ids.push(item.id);
    }
    ids.sort();
    citeproc.updateItems(ids);
    res += make_bibliography(citeproc) + "\n";

    var output_file = "output-" + citation_format + ".md";
    fs.writeFileSync(output_file, res);
}


main();
