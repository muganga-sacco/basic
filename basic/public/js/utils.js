frappe.provide('basic');
frappe.provide('basic.utils');

$.extend(basic, {
  get_currency: function (company) {
    if (!company && cur_frm) company = cur_frm.doc.company;
    if (company)
      return (
        frappe.get_doc(':Company', company)?.default_currency ||
        frappe.boot.sysdefaults.currency
      );
    else return frappe.boot.sysdefaults.currency;
  },

  get_presentation_currency_list: () => {
    const docs = frappe.boot.docs;
    let currency_list = docs
      .filter((d) => d.doctype === ':Currency')
      .map((d) => d.name);
    currency_list.unshift('');
    return currency_list;
  },

  toggle_naming_series: function () {
    if (cur_frm && cur_frm.fields_dict.naming_series) {
      cur_frm.toggle_display(
        'naming_series',
        cur_frm.doc.__islocal ? true : false
      );
    }
  },

  hide_company: function (frm) {
    if (frm?.fields_dict.company) {
      var companies = Object.keys(locals[':Company'] || {});
      if (companies.length === 1) {
        if (!frm.doc.company) frm.set_value('company', companies[0]);
        frm.toggle_display('company', false);
      } else if (basic.last_selected_company) {
        if (!frm.doc.company)
          frm.set_value('company', basic.last_selected_company);
      }
    }
  },

  route_to_pending_reposts: (args) => {
    frappe.set_route('List', 'Repost Item Valuation', args);
  },
});

$.extend(basic.utils, {
  copy_value_in_all_rows: function (doc, dt, dn, table_fieldname, fieldname) {
    var d = locals[dt][dn];
    if (d[fieldname]) {
      var cl = doc[table_fieldname] || [];
      for (var i = 0; i < cl.length; i++) {
        if (!cl[i][fieldname]) cl[i][fieldname] = d[fieldname];
      }
    }
    refresh_field(table_fieldname);
  },

  get_terms: function (tc_name, doc, callback) {
    if (tc_name) {
      return frappe.call({
        method:
          'basic.setup.doctype.terms_and_conditions.terms_and_conditions.get_terms_and_conditions',
        args: {
          template_name: tc_name,
          doc: doc,
        },
        callback: function (r) {
          callback(r);
        },
      });
    }
  },

  /**
   * Checks if the first row of a given child table is empty
   * @param child_table - Child table Doctype
   * @return {Boolean}
   **/
  first_row_is_empty: function (child_table) {
    if ($.isArray(child_table) && child_table.length > 0) {
      return !child_table[0].item_code;
    }
    return false;
  },

  /**
   * Removes the first row of a child table if it is empty
   * @param {_Frm} frm - The current form
   * @param {String} child_table_name - The child table field name
   * @return {Boolean}
   **/
  remove_empty_first_row: function (frm, child_table_name) {
    const rows = frm['doc'][child_table_name];
    if (this.first_row_is_empty(rows)) {
      frm['doc'][child_table_name] = rows.splice(1);
    }
    return rows;
  },
  get_tree_options: function (option) {
    // get valid options for tree based on user permission & locals dict
    let unscrub_option = frappe.model.unscrub(option);
    let user_permission = frappe.defaults.get_user_permissions();
    let options;

    if (user_permission && user_permission[unscrub_option]) {
      options = user_permission[unscrub_option].map((perm) => perm.doc);
    } else {
      options = $.map(locals[`:${unscrub_option}`], function (c) {
        return c.name;
      }).sort();
    }

    // filter unique values, as there may be multiple user permissions for any value
    return options.filter(
      (value, index, self) => self.indexOf(value) === index
    );
  },
  get_tree_default: function (option) {
    // set default for a field based on user permission
    let options = this.get_tree_options(option);
    if (options.includes(frappe.defaults.get_default(option))) {
      return frappe.defaults.get_default(option);
    } else {
      return options[0];
    }
  },
});

frappe.form.link_formatters['Employee'] = function (value, doc) {
  if (
    doc &&
    value &&
    doc.employee_name &&
    doc.employee_name !== value &&
    doc.employee === value
  ) {
    return value + ': ' + doc.employee_name;
  } else if (!value && doc.doctype && doc.employee_name) {
    // format blank value in child table
    return doc.employee;
  } else {
    // if value is blank in report view or project name and name are the same, return as is
    return value;
  }
};

function get_status(expected, actual) {
  const time_left = moment(expected).diff(moment(actual));
  if (time_left >= 0) {
    return { diff_display: 'Fulfilled', indicator: 'green' };
  } else {
    return { diff_display: 'Failed', indicator: 'red' };
  }
}
